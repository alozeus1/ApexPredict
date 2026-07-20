import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import {
  assemblePrediction,
  DEFAULT_MARKET_TYPE,
  buildPredictionContext,
  clamp,
  hasDraw,
  selectPick,
  type EnginePrediction,
  type MarketDistribution,
  type PredictionContext,
  type OutcomeMarketType,
  type PredictionInput,
  type PredictionMarket,
} from './model';
import {
  blendSignals,
  eloDistribution,
  poissonDistribution,
  signalAgreement,
  type AgentSignal,
} from './signals';
import { buildBaselineEnrichment, enrichmentNarrative, type PredictionEnrichment } from './enrichment';

type PredictionGraphValue = {
  input: PredictionInput;
  inputEnrichment?: PredictionEnrichment;
  context?: PredictionContext;
  enrichment?: PredictionEnrichment;
  eloSignal?: AgentSignal;
  poissonSignal?: AgentSignal;
  xgSignal?: AgentSignal;
  ensembleDistribution?: MarketDistribution;
  agreement?: number;
  prediction?: EnginePrediction;
};

const PredictionGraphState = Annotation.Root({
  input: Annotation<PredictionInput>(),
  inputEnrichment: Annotation<PredictionEnrichment | undefined>(),
  context: Annotation<PredictionContext | undefined>(),
  enrichment: Annotation<PredictionEnrichment | undefined>(),
  eloSignal: Annotation<AgentSignal | undefined>(),
  poissonSignal: Annotation<AgentSignal | undefined>(),
  xgSignal: Annotation<AgentSignal | undefined>(),
  ensembleDistribution: Annotation<MarketDistribution | undefined>(),
  agreement: Annotation<number | undefined>(),
  prediction: Annotation<EnginePrediction | undefined>(),
});

const graph = new StateGraph(PredictionGraphState)
  .addNode('context-agent', async (state: PredictionGraphValue) => ({
    context: buildPredictionContext(state.input),
    enrichment:
      state.inputEnrichment ??
      buildBaselineEnrichment(state.input.match, state.input.homeStats, state.input.awayStats),
  }))
  .addNode('elo-agent', async (state: PredictionGraphValue) => {
    if (!state.context) throw new Error('Missing prediction context');
    const signal: AgentSignal = {
      name: 'elo',
      available: true,
      weight: 0.5,
      distribution: eloDistribution(
        state.context.homeStrength,
        state.context.awayStrength,
        state.context.marketType,
      ),
    };
    return { eloSignal: signal };
  })
  .addNode('poisson-agent', async (state: PredictionGraphValue) => {
    if (!state.enrichment || !state.context) throw new Error('Missing fixture enrichment');
    const marketType = state.context.marketType;

    // The Poisson goal model is football-specific. Applying it to a two-way
    // sport would be modelling basketball points as if they were goals, so the
    // signal declares itself unavailable rather than producing a wrong number.
    // Sport-specific scoring models arrive with each sport (P5).
    if (!hasDraw(marketType)) {
      const signal: AgentSignal = {
        name: 'poisson',
        available: false,
        weight: 0,
        reason: 'poisson-goal-model-is-football-only',
      };
      return { poissonSignal: signal };
    }

    const { expectedHomeGoals, expectedAwayGoals } = state.enrichment.goals;
    const signal: AgentSignal = {
      name: 'poisson',
      available: true,
      weight: 0.5,
      distribution: poissonDistribution(expectedHomeGoals, expectedAwayGoals),
    };
    return { poissonSignal: signal };
  })
  .addNode('xg-agent', async (state: PredictionGraphValue) => {
    if (!state.enrichment) throw new Error('Missing fixture enrichment');
    // The current xG figure is derived from the same season goal rates the
    // Poisson branch uses, so it carries no independent information. It is
    // reported for continuity of the `PredictionSnapshot.xg` column but given
    // zero ensemble weight — double-counting one signal is not an ensemble.
    //
    // This agent re-enters the blend when shot-event data lands (P2), at which
    // point it becomes genuinely independent.
    const { expectedHomeGoals, expectedAwayGoals } = state.enrichment.goals;
    const football = hasDraw(state.context?.marketType ?? DEFAULT_MARKET_TYPE);
    const signal: AgentSignal = {
      name: 'xg',
      available: false,
      weight: 0,
      ...(football ? { distribution: poissonDistribution(expectedHomeGoals, expectedAwayGoals) } : {}),
      reason: football ? 'shot-event-feed-not-connected' : 'xg-model-is-football-only',
    };
    return { xgSignal: signal };
  })
  .addNode('ensemble-agent', async (state: PredictionGraphValue) => {
    if (!state.context || !state.eloSignal || !state.poissonSignal || !state.xgSignal) {
      throw new Error('Missing prediction agent signal');
    }

    const marketType: OutcomeMarketType = state.context.marketType;
    const signals = [state.eloSignal, state.poissonSignal, state.xgSignal];
    const ensembleDistribution = blendSignals(signals, marketType);
    if (!ensembleDistribution) throw new Error('No usable agent signal produced a distribution');

    const agreement = signalAgreement(signals, marketType);

    // The ensemble now drives the pick. Previously it was computed, written to
    // the snapshot and displayed, while the selected market came from the raw
    // single-signal heuristic — the headline number had no effect on the call.
    const ensembleContext = buildPredictionContext(state.input, ensembleDistribution, marketType);
    const pick = selectPick(ensembleContext.markets);
    const market: PredictionMarket = pick.market;

    const confidence = clamp(
      0.5 + Math.abs(ensembleContext.spread) * 0.3 + Math.max(0, pick.edge) * 0.35 - (1 - agreement) * 0.25,
      0.5,
      0.86,
    );

    const disagreementNote =
      agreement < 0.85 ? ` Model agreement is ${(agreement * 100).toFixed(0)}%, so confidence is damped.` : '';
    const enrichmentNote = state.enrichment ? enrichmentNarrative(state.enrichment) : '';

    // Every reported signal value is the probability that signal assigns to the
    // SAME market, so the stored columns are directly comparable.
    return {
      ensembleDistribution,
      agreement,
      prediction: assemblePrediction(state.input, ensembleContext, {
        elo: state.eloSignal.distribution?.[market] ?? ensembleDistribution[market],
        poisson: state.poissonSignal.distribution?.[market] ?? ensembleDistribution[market],
        xg: state.xgSignal.distribution?.[market] ?? ensembleDistribution[market],
        ensemble: ensembleDistribution[market],
        confidence,
        narrativeSuffix: `${enrichmentNote}${disagreementNote}`.trim(),
      }),
    };
  })
  .addEdge(START, 'context-agent')
  .addEdge('context-agent', 'elo-agent')
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
    ensembleDistribution: state.ensembleDistribution,
    agreement: state.agreement,
    signals: {
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
