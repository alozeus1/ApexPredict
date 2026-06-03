import { prisma } from '@apexpredix/db';

export interface BacktestMetricTile {
  label: string;
  value: string;
}

export interface BacktestMetrics {
  summary: string;
  tiles: BacktestMetricTile[];
}

const FALLBACK: BacktestMetrics = {
  summary: 'Awaiting settled live predictions. Past performance does not guarantee future results.',
  tiles: [
    { label: 'Total Staked', value: '$0.00' },
    { label: 'Total Returned', value: '$0.00' },
    { label: 'Net Profit', value: '$0.00' },
    { label: 'ROI', value: '0.0%' },
    { label: 'Hit Rate', value: '0.0%' },
    { label: 'Calibration Error', value: '0.0%' },
  ],
};

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export async function getBacktestMetrics(): Promise<BacktestMetrics> {
  if (!process.env.DATABASE_URL) return FALLBACK;

  try {
    const latest = await prisma.predictionBacktestRun.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!latest || latest.sampleSize === 0) return FALLBACK;

    return {
      summary:
        `Rolling ${latest.windowDays}-day evaluation across ${latest.sampleSize} settled predictions. ` +
        `Includes flat-stake ROI, hit rate, Brier score, log loss, and calibration error.`,
      tiles: [
        { label: 'Total Staked', value: money(latest.totalStaked) },
        { label: 'Total Returned', value: money(latest.totalReturned) },
        { label: 'Net Profit', value: money(latest.netProfit) },
        { label: 'ROI', value: percent(latest.roi) },
        { label: 'Hit Rate', value: percent(latest.hitRate) },
        { label: 'Calibration Error', value: percent(latest.calibrationError) },
      ],
    };
  } catch {
    return FALLBACK;
  }
}
