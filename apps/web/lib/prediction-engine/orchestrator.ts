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
  /**
   * Adaptive ensemble weights per signal name (gap #5), injected by the caller
   * from measured performance (`ensemble-weights.ts`). The graph stays pure: it
   * consumes weights but never reads the database. Absent → each signal falls
   * back to its historical fixed weight, so behaviour is unchanged until weights
   * are supplied.
   */
  weights?: Record<string, number>;
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
  weights: Annotation<Record<string, number> | undefined>(),
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
      weight: state.weights?.elo ?? 0.5,
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
      weight: state.weights?.poisson ?? 0.5,
      distribution: poissonDistribution(expectedHomeGoals, expectedAwayGoals),
    };
    return { poissonSignal: signal };
  })
  .addNode('xg-agent', async (state: PredictionGraphValue) => {
    if (!state.enrichment) throw new Error('Missing fixture enrichment');
    const football = hasDraw(state.context?.marketType ?? DEFAULT_MARKET_TYPE);

    // The xG signal is now driven by SHOT data (gap #4), which is independent of
    // the season goal rates the Poisson branch uses — so it is a real third
    // signal, not a re-badged copy. It participates only when shot history was
    // available; otherwise it stays weight 0 with an honest reason rather than
    // fabricating a number from goals it does not have.
    const shots = state.enrichment.shots;
    const shotsUsable =
      football &&
      shots?.available === true &&
      typeof shots.expectedHomeGoals === 'number' &&
      typeof shots.expectedAwayGoals === 'number';

    if (shotsUsable) {
      const signal: AgentSignal = {
        name: 'xg',
        available: true,
        weight: state.weights?.xg ?? 0.3,
        distribution: poissonDistribution(shots!.expectedHomeGoals!, shots!.expectedAwayGoals!),
        reason: shots!.method,
      };
      return { xgSignal: signal };
    }

    // Fallback: reported for continuity of the `PredictionSnapshot.xg` column,
    // but zero weight so a missing shot feed cannot silently sway the ensemble.
    const { expectedHomeGoals, expectedAwayGoals } = state.enrichment.goals;
    const signal: AgentSignal = {
      name: 'xg',
      available: false,
      weight: 0,
      ...(football ? { distribution: poissonDistribution(expectedHomeGoals, expectedAwayGoals) } : {}),
      reason: football ? (shots?.reason ?? 'shot-feed-not-connected') : 'xg-model-is-football-only',
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

export async function runPredictionGraph(
  input: PredictionInput,
  enrichment?: PredictionEnrichment,
  weights?: Record<string, number>,
) {
  const state = await graph.invoke({
    input,
    ...(enrichment ? { inputEnrichment: enrichment } : {}),
    ...(weights ? { weights } : {}),
  });
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

export async function generatePredictionWithAgents(
  input: PredictionInput,
  weights?: Record<string, number>,
): Promise<EnginePrediction> {
  try {
    const result = await runPredictionGraph(input, undefined, weights);
    return result.prediction;
  } catch {
    return assemblePrediction(input);
  }
}
