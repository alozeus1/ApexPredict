import { prisma } from '@apexpredix/db';

export interface BacktestMetricTile {
  label: string;
  value: string;
}

export interface BacktestMetrics {
  summary: string;
  tiles: BacktestMetricTile[];
}

// Shown until we cross the publication threshold. No real numbers with a tiny n —
// tiles are dashed placeholders, not zeros presented as performance.
const MIN_SAMPLE = 100;
const FALLBACK: BacktestMetrics = {
  summary:
    'Sample size below 100 picks — figures will display once we cross that threshold. ' +
    'Past performance does not guarantee future results.',
  tiles: [
    { label: 'Total Staked', value: '—' },
    { label: 'Total Returned', value: '—' },
    { label: 'Net Profit', value: '—' },
    { label: 'ROI', value: '—' },
    { label: 'Hit Rate', value: '—' },
    { label: 'Brier Score', value: '—' },
    { label: 'Log Loss', value: '—' },
    { label: 'Calibration Error', value: '—' },
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
    if (!latest || latest.sampleSize < MIN_SAMPLE) return FALLBACK;

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
        { label: 'Brier Score', value: latest.brierScore.toFixed(3) },
        { label: 'Log Loss', value: latest.logLoss.toFixed(3) },
        { label: 'Calibration Error', value: percent(latest.calibrationError) },
      ],
    };
  } catch {
    return FALLBACK;
  }
}
