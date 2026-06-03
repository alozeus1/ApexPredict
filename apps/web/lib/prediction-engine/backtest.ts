import type { PrismaClient } from '@apexpredix/db';

const EPSILON = 0.000001;

interface PredictionForEvaluation {
  id: string;
  fixtureId: string;
  market: string;
  probability: number;
  confidence: number;
  edge: number;
  fixture: {
    result: { homeScore: number; awayScore: number } | null;
    odds: Array<{ market: string; price: number }>;
  };
}

function resultMarket(result: { homeScore: number; awayScore: number }) {
  if (result.homeScore > result.awayScore) return '1';
  if (result.homeScore < result.awayScore) return '2';
  return 'X';
}

function safeLogLoss(probability: number, hit: boolean) {
  const p = Math.min(1 - EPSILON, Math.max(EPSILON, probability));
  return hit ? -Math.log(p) : -Math.log(1 - p);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pickPrice(prediction: PredictionForEvaluation) {
  const marketOdds = prediction.fixture.odds.filter((odd) => odd.market === prediction.market && odd.price > 1);
  if (marketOdds.length === 0) return Number((1 / Math.max(0.05, prediction.probability)).toFixed(2));
  const first = marketOdds[0];
  if (!first) return Number((1 / Math.max(0.05, prediction.probability)).toFixed(2));
  return marketOdds.reduce((best, odd) => (odd.price > best.price ? odd : best), first).price;
}

function bucketBounds(probability: number) {
  const lower = Math.min(0.9, Math.floor(probability * 10) / 10);
  const upper = Math.min(1, lower + 0.1);
  return { lower, upper, label: `${Math.round(lower * 100)}-${Math.round(upper * 100)}%` };
}

async function evaluateSettledPredictions(prisma: PrismaClient, stake: number) {
  const predictions = await prisma.predictionSnapshot.findMany({
    where: {
      evaluation: null,
      fixture: { result: { isNot: null } },
    },
    include: {
      fixture: {
        include: {
          result: true,
          odds: true,
        },
      },
    },
  });

  let evaluated = 0;
  for (const prediction of predictions) {
    if (!prediction.fixture.result) continue;
    const settledMarket = resultMarket(prediction.fixture.result);
    const hit = prediction.market === settledMarket;
    const price = pickPrice(prediction);
    const returned = hit ? stake * price : 0;
    const profit = returned - stake;

    await prisma.predictionEvaluation.upsert({
      where: { predictionId: prediction.id },
      create: {
        predictionId: prediction.id,
        fixtureId: prediction.fixtureId,
        market: prediction.market,
        resultMarket: settledMarket,
        probability: prediction.probability,
        confidence: prediction.confidence,
        price,
        impliedProbability: 1 / price,
        edge: prediction.edge,
        stake,
        returned,
        profit,
        hit,
        brierScore: (prediction.probability - (hit ? 1 : 0)) ** 2,
        logLoss: safeLogLoss(prediction.probability, hit),
      },
      update: {},
    });
    evaluated += 1;
  }

  return evaluated;
}

function calibrationBuckets(evaluations: Array<{ probability: number; hit: boolean }>) {
  const grouped = new Map<string, Array<{ probability: number; hit: boolean; lower: number; upper: number }>>();
  for (const evaluation of evaluations) {
    const bounds = bucketBounds(evaluation.probability);
    const items = grouped.get(bounds.label) ?? [];
    items.push({ ...evaluation, lower: bounds.lower, upper: bounds.upper });
    grouped.set(bounds.label, items);
  }

  return [...grouped.entries()].map(([bucket, items]) => {
    const averageProbability = average(items.map((item) => item.probability));
    const observedRate = average(items.map((item) => (item.hit ? 1 : 0)));
    return {
      bucket,
      lowerBound: items[0]?.lower ?? 0,
      upperBound: items[0]?.upper ?? 0,
      sampleSize: items.length,
      averageProbability,
      observedRate,
      calibrationError: Math.abs(averageProbability - observedRate),
    };
  });
}

export async function runBacktest(prisma: PrismaClient, options: { windowDays?: number; stake?: number } = {}) {
  const windowDays = options.windowDays ?? 90;
  const stake = options.stake ?? 10;
  const evaluatedNow = await evaluateSettledPredictions(prisma, stake);
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - windowDays);

  const evaluations = await prisma.predictionEvaluation.findMany({
    where: { evaluatedAt: { gte: since } },
    orderBy: { evaluatedAt: 'desc' },
  });

  const sampleSize = evaluations.length;
  const totalStaked = evaluations.reduce((sum, item) => sum + item.stake, 0);
  const totalReturned = evaluations.reduce((sum, item) => sum + item.returned, 0);
  const netProfit = totalReturned - totalStaked;
  const buckets = calibrationBuckets(evaluations);
  const calibrationError = sampleSize
    ? buckets.reduce((sum, bucket) => sum + bucket.calibrationError * bucket.sampleSize, 0) / sampleSize
    : 0;

  const run = await prisma.predictionBacktestRun.create({
    data: {
      windowDays,
      sampleSize,
      hitRate: average(evaluations.map((item) => (item.hit ? 1 : 0))),
      roi: totalStaked ? netProfit / totalStaked : 0,
      totalStaked,
      totalReturned,
      netProfit,
      averageConfidence: average(evaluations.map((item) => item.confidence)),
      averageEdge: average(evaluations.map((item) => item.edge)),
      brierScore: average(evaluations.map((item) => item.brierScore)),
      logLoss: average(evaluations.map((item) => item.logLoss)),
      calibrationError,
      buckets: { create: buckets },
    },
    include: { buckets: true },
  });

  return { run, evaluatedNow };
}
