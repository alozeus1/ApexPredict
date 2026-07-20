import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { assemblePrediction, buildPredictionContext, clamp, type EnginePrediction, type PredictionContext, type PredictionInput, type PredictionMarket } from './model';
import { buildBaselineEnrichment, enrichmentNarrative, type PredictionEnrichment } from './enrichment';

interface MarketSignal {
  market: PredictionMarket;
  probability: number;
  edge: number;
  hasRealOdds: boolean;
}

interface EloSignal {
  market: PredictionMarket;
  score: number;
}

interface PoissonSignal {
  market: PredictionMarket;
  score: number;
  homeGoals: number;
  awayGoals: number;
}

interface XgSignal {
  market: PredictionMarket;
  score: number;
}

type PredictionGraphValue = {
  input: PredictionInput;
  inputEnrichment?: PredictionEnrichment;
  context?: PredictionContext;
  enrichment?: PredictionEnrichment;
  marketSignal?: MarketSignal;
  eloSignal?: EloSignal;
  poissonSignal?: PoissonSignal;
  xgSignal?: XgSignal;
  prediction?: EnginePrediction;
};

const PredictionGraphState = Annotation.Root({
  input: Annotation<PredictionInput>(),
  inputEnrichment: Annotation<PredictionEnrichment | undefined>(),
  context: Annotation<PredictionContext | undefined>(),
  enrichment: Annotation<PredictionEnrichment | undefined>(),
  marketSignal: Annotation<MarketSignal | undefined>(),
  eloSignal: Annotation<EloSignal | undefined>(),
  poissonSignal: Annotation<PoissonSignal | undefined>(),
  xgSignal: Annotation<XgSignal | undefined>(),
  prediction: Annotation<EnginePrediction | undefined>(),
});

function strongestMarket(context: PredictionContext): MarketSignal {
  const first = context.markets[0];
  if (!first) throw new Error('Prediction graph produced no candidate markets');

  const pick = context.markets.reduce((best, candidate) => {
    if (candidate.edge > best.edge) return candidate;
    if (candidate.edge === best.edge && candidate.probability > best.probability) return candidate;
    return best;
  }, first);

  return {
    market: pick.market,
    probability: pick.probability,
    edge: pick.edge,
    hasRealOdds: !pick.synthetic,
  };
}

function poissonProbability(lambda: number, goals: number) {
  let factorial = 1;
  for (let i = 2; i <= goals; i += 1) factorial *= i;
  return (Math.E ** -lambda * lambda ** goals) / factorial;
}

function poissonMarkets(homeGoals: number, awayGoals: number) {
  let home = 0;
  let draw = 0;
  let away = 0;

  for (let h = 0; h <= 7; h += 1) {
    for (let a = 0; a <= 7; a += 1) {
      const probability = poissonProbability(homeGoals, h) * poissonProbability(awayGoals, a);
      if (h > a) home += probability;
      else if (h === a) draw += probability;
      else away += probability;
    }
  }

  const total = home + draw + away;
  return {
    '1': home / total,
    X: draw / total,
    '2': away / total,
  };
}

function bestProbabilityMarket(probabilities: Record<PredictionMarket, number>): PredictionMarket {
  return (['1', 'X', '2'] as const).reduce((best, market) =>
    probabilities[market] > probabilities[best] ? market : best,
  );
}

const graph = new StateGraph(PredictionGraphState)
  .addNode('context-agent', async (state: PredictionGraphValue) => ({
    context: buildPredictionContext(state.input),
    enrichment: state.inputEnrichment ?? buildBaselineEnrichment(state.input.match, state.input.homeStats, state.input.awayStats),
  }))
  .addNode('market-agent', async (state: PredictionGraphValue) => {
    if (!state.context) throw new Error('Missing prediction context');
    return { marketSignal: strongestMarket(state.context) };
  })
  .addNode('elo-agent', async (state: PredictionGraphValue) => {
    if (!state.context) throw new Error('Missing prediction context');
    const marketSignal = strongestMarket(state.context);
    return {
      eloSignal: {
        market: marketSignal.market,
        score: clamp(marketSignal.probability * 0.98 + state.context.homeStrength * 0.02, 0.08, 0.86),
      },
    };
  })
  .addNode('poisson-agent', async (state: PredictionGraphValue) => {
    if (!state.enrichment) throw new Error('Missing fixture enrichment');
    const probabilities = poissonMarkets(state.enrichment.goals.expectedHomeGoals, state.enrichment.goals.expectedAwayGoals);
    const market = bestProbabilityMarket(probabilities);
    return {
      poissonSignal: {
        market,
        score: clamp(probabilities[market], 0.08, 0.86),
        homeGoals: state.enrichment.goals.expectedHomeGoals,
        awayGoals: state.enrichment.goals.expectedAwayGoals,
      },
    };
  })
  .addNode('xg-agent', async (state: PredictionGraphValue) => {
    if (!state.context) throw new Error('Missing prediction context');
    const marketSignal = state.marketSignal ?? strongestMarket(state.context);
    const goalDelta =
      ((state.input.homeStats?.goalsFor ?? 0) - (state.input.awayStats?.goalsAgainst ?? 0)) / 500;
    return {
      xgSignal: {
        market: marketSignal.market,
        score: clamp(marketSignal.probability * 0.82 + goalDelta, 0.08, 0.86),
      },
    };
  })
  .addNode('ensemble-agent', async (state: PredictionGraphValue) => {
    if (!state.context || !state.marketSignal || !state.eloSignal || !state.poissonSignal || !state.xgSignal) {
      throw new Error('Missing prediction agent signal');
    }

    const confidence = clamp(
      0.5 + Math.abs(state.context.spread) * 0.42 + Math.max(0, state.marketSignal.edge) * 0.35,
      0.52,
      0.86,
    );
    const ensemble = clamp(
      state.eloSignal.score * 0.34 + state.poissonSignal.score * 0.33 + state.xgSignal.score * 0.33,
      0.08,
      0.86,
    );

    const narrativeSuffix = state.enrichment ? enrichmentNarrative(state.enrichment) : undefined;
    return {
      prediction: assemblePrediction(state.input, state.context, {
        elo: state.eloSignal.score,
        poisson: state.poissonSignal.score,
        xg: state.xgSignal.score,
        ensemble,
        confidence,
        ...(narrativeSuffix ? { narrativeSuffix } : {}),
      }),
    };
  })
  .addEdge(START, 'context-agent')
  .addEdge('context-agent', 'market-agent')
  .addEdge('market-agent', 'elo-agent')
  .addEdge('elo-agent', 'poisson-agent')
  .addEdge('poisson-agent', 'xg-agent')
  .addEdge('xg-agent', 'ensemble-agent')
  .addEdge('ensemble-agent', END)
  .compile();

export async function runPredictionGraph(input: PredictionInput, enrichment?: PredictionEnrichment) {
  const state = await graph.invoke({ input, ...(enrichment ? { inputEnrichment: enrichment } : {}) });
  if (!state.prediction) throw new Error('Prediction graph completed without a prediction');
  return {
    prediction: state.prediction,
    enrichment: state.enrichment,
    signals: {
      market: state.marketSignal,
      elo: state.eloSignal,
      poisson: state.poissonSignal,
      xg: state.xgSignal,
    },
  };
}

export async function generatePredictionWithAgents(input: PredictionInput): Promise<EnginePrediction> {
  try {
    const result = await runPredictionGraph(input);
    return result.prediction;
  } catch {
    return assemblePrediction(input);
  }
}
