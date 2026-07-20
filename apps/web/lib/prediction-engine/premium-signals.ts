import type { PrismaClient } from '@apexpredix/db';
import type { EnginePrediction } from './model';
import type { MarketOdd } from '@/lib/providers/odds/types';

const ODDS_MOVEMENT_ALERT_THRESHOLD = Number(process.env.ODDS_MOVEMENT_ALERT_THRESHOLD ?? 0.02);

function movementPct(previousPrice: number, currentPrice: number) {
  return previousPrice > 0 ? Math.abs(currentPrice - previousPrice) / previousPrice : 0;
}

export async function persistMarketOdds(
  prisma: PrismaClient,
  fixtureId: string,
  odds: MarketOdd[],
) {
  let oddsWritten = 0;
  let movementsWritten = 0;
  let movementAlertsQueued = 0;

  for (const odd of odds) {
    if (odd.price <= 1) continue;

    const previous = await prisma.odds.findFirst({
      where: { fixtureId, bookCode: odd.bookCode, market: odd.market },
      orderBy: { capturedAt: 'desc' },
    });

    await prisma.odds.create({
      data: {
        fixtureId,
        bookCode: odd.bookCode,
        market: odd.market,
        price: odd.price,
      },
    });
    oddsWritten += 1;

    if (!previous || previous.price === odd.price) continue;

    const pct = movementPct(previous.price, odd.price);
    await prisma.oddsMovement.create({
      data: {
        fixtureId,
        bookCode: odd.bookCode,
        market: odd.market,
        previousPrice: previous.price,
        currentPrice: odd.price,
        delta: odd.price - previous.price,
        movementPct: pct,
        source: odd.source ?? 'provider',
      },
    });
    movementsWritten += 1;

    if (pct >= ODDS_MOVEMENT_ALERT_THRESHOLD) {
      await prisma.predictionAlert.upsert({
        where: { dedupeKey: `${fixtureId}:odds-move:${odd.bookCode}:${odd.market}:${odd.price}` },
        create: {
          fixtureId,
          kind: 'ODDS_MOVEMENT',
          severity: pct >= 0.05 ? 'high' : 'medium',
          title: 'Odds movement detected',
          message: `${odd.bookCode} moved ${odd.market} from ${previous.price.toFixed(2)} to ${odd.price.toFixed(2)}.`,
          dedupeKey: `${fixtureId}:odds-move:${odd.bookCode}:${odd.market}:${odd.price}`,
          channels: { email: true, telegram: true, web: true },
        },
        update: {},
      });
      movementAlertsQueued += 1;
    }
  }

  return { oddsWritten, movementsWritten, movementAlertsQueued };
}

export async function queueValueBetAlert(
  prisma: PrismaClient,
  fixtureId: string,
  prediction: EnginePrediction,
) {
  if (!prediction.valueBet) return false;

  await prisma.predictionAlert.upsert({
    where: { dedupeKey: `${fixtureId}:value-bet:${prediction.market}` },
    create: {
      fixtureId,
      kind: 'VALUE_BET',
      severity: prediction.confidence >= 0.7 ? 'high' : 'medium',
      title: 'Value bet flagged',
      message:
        `${prediction.topPick} is flagged at ${(prediction.probability * 100).toFixed(1)}% model probability ` +
        `with ${(prediction.edge * 100).toFixed(1)} percentage points of edge.`,
      dedupeKey: `${fixtureId}:value-bet:${prediction.market}`,
      channels: { email: true, telegram: true, web: true },
    },
    update: {},
  });

  return true;
}
