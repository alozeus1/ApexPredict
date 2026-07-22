/**
 * Probability calibration and calibration metrics (Phase 8).
 *
 * Calibration is the property the product is sold on: a prediction shown as 70%
 * must occur close to 70% of the time. Accuracy does not imply calibration — a
 * model that says 95% on every heavy favourite can be accurate and badly
 * overconfident at the same time.
 *
 * Calibrators MUST be fitted on a validation split that is chronologically
 * separate from both the training data and the final test data. Fitting a
 * calibrator on the test set makes every downstream metric meaningless.
 */

export interface LabelledProbability {
  probability: number;
  /** True when the predicted outcome actually occurred. */
  occurred: boolean;
}

const EPSILON = 1e-12;

function clampProbability(value: number): number {
  return Math.min(1 - EPSILON, Math.max(EPSILON, value));
}

// ── Metrics ──────────────────────────────────────────────────────────────────

/** Binary Brier score. Lower is better; 0.25 is the score of always saying 50%. */
export function brierScore(samples: LabelledProbability[]): number {
  if (samples.length === 0) return 0;
  const total = samples.reduce((sum, sample) => {
    const error = sample.probability - (sample.occurred ? 1 : 0);
    return sum + error * error;
  }, 0);
  return total / samples.length;
}

/** Binary log loss. Lower is better. Punishes confident errors hard. */
export function logLoss(samples: LabelledProbability[]): number {
  if (samples.length === 0) return 0;
  const total = samples.reduce((sum, sample) => {
    const p = clampProbability(sample.probability);
    return sum + (sample.occurred ? -Math.log(p) : -Math.log(1 - p));
  }, 0);
  return total / samples.length;
}

export interface ReliabilityBin {
  lowerBound: number;
  upperBound: number;
  label: string;
  sampleSize: number;
  averageProbability: number;
  observedRate: number;
  calibrationError: number;
}

/** Reliability diagram data: predicted vs observed, bucketed. */
export function reliabilityBins(samples: LabelledProbability[], binCount = 10): ReliabilityBin[] {
  const bins: ReliabilityBin[] = [];

  for (let index = 0; index < binCount; index += 1) {
    const lowerBound = index / binCount;
    const upperBound = (index + 1) / binCount;
    const inBin = samples.filter((sample) =>
      index === binCount - 1
        ? sample.probability >= lowerBound && sample.probability <= upperBound
        : sample.probability >= lowerBound && sample.probability < upperBound,
    );

    const averageProbability =
      inBin.length > 0 ? inBin.reduce((sum, sample) => sum + sample.probability, 0) / inBin.length : 0;
    const observedRate =
      inBin.length > 0 ? inBin.filter((sample) => sample.occurred).length / inBin.length : 0;

    bins.push({
      lowerBound,
      upperBound,
      label: `${Math.round(lowerBound * 100)}-${Math.round(upperBound * 100)}%`,
      sampleSize: inBin.length,
      averageProbability,
      observedRate,
      calibrationError: inBin.length > 0 ? Math.abs(averageProbability - observedRate) : 0,
    });
  }

  return bins;
}

/** Expected calibration error: sample-weighted mean gap between predicted and observed. */
export function expectedCalibrationError(samples: LabelledProbability[], binCount = 10): number {
  if (samples.length === 0) return 0;
  return reliabilityBins(samples, binCount).reduce(
    (sum, bin) => sum + (bin.sampleSize / samples.length) * bin.calibrationError,
    0,
  );
}

/** Maximum calibration error across non-empty bins. Surfaces localised failures ECE hides. */
export function maxCalibrationError(samples: LabelledProbability[], binCount = 10): number {
  const populated = reliabilityBins(samples, binCount).filter((bin) => bin.sampleSize > 0);
  return populated.length === 0 ? 0 : Math.max(...populated.map((bin) => bin.calibrationError));
}

// ── Calibrators ──────────────────────────────────────────────────────────────

export interface Calibrator {
  method: 'identity' | 'platt' | 'isotonic';
  apply(probability: number): number;
  /** Number of validation samples the calibrator was fitted on. */
  sampleSize: number;
}

/** Pass-through. Used when there is not enough validation data to fit anything. */
export function identityCalibrator(sampleSize = 0): Calibrator {
  return { method: 'identity', sampleSize, apply: (probability) => probability };
}

/**
 * Platt scaling: logistic regression on the log-odds of the raw probability.
 * Two parameters, so it is stable on small samples — the right default when
 * validation data is limited.
 */
export function fitPlattCalibrator(samples: LabelledProbability[], iterations = 200): Calibrator {
  if (samples.length < 20) return identityCalibrator(samples.length);

  let a = 1;
  let b = 0;
  const learningRate = 0.1;

  const logit = (p: number) => {
    const clamped = clampProbability(p);
    return Math.log(clamped / (1 - clamped));
  };

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let gradA = 0;
    let gradB = 0;

    for (const sample of samples) {
      const x = logit(sample.probability);
      const predicted = 1 / (1 + Math.exp(-(a * x + b)));
      const error = (sample.occurred ? 1 : 0) - predicted;
      gradA += error * x;
      gradB += error;
    }

    a += (learningRate * gradA) / samples.length;
    b += (learningRate * gradB) / samples.length;
  }

  return {
    method: 'platt',
    sampleSize: samples.length,
    apply: (probability) => {
      const x = logit(probability);
      return clampProbability(1 / (1 + Math.exp(-(a * x + b))));
    },
  };
}

/**
 * Isotonic regression via pool-adjacent-violators.
 *
 * Non-parametric and more flexible than Platt, but it overfits on small
 * samples — hence the 200-sample floor, below which we fall back rather than
 * produce a confident-looking curve fitted to noise.
 */
export function fitIsotonicCalibrator(samples: LabelledProbability[], minimumSamples = 200): Calibrator {
  if (samples.length < minimumSamples) return identityCalibrator(samples.length);

  const sorted = [...samples].sort((left, right) => left.probability - right.probability);
  const values: number[] = sorted.map((sample) => (sample.occurred ? 1 : 0));
  const weights = sorted.map(() => 1);
  const xs = sorted.map((sample) => sample.probability);

  // Pool adjacent violators.
  let index = 0;
  while (index < values.length - 1) {
    if ((values[index] as number) <= (values[index + 1] as number)) {
      index += 1;
      continue;
    }

    const pooledWeight = (weights[index] as number) + (weights[index + 1] as number);
    const pooledValue =
      ((values[index] as number) * (weights[index] as number) +
        (values[index + 1] as number) * (weights[index + 1] as number)) /
      pooledWeight;

    values[index] = pooledValue;
    weights[index] = pooledWeight;
    values.splice(index + 1, 1);
    weights.splice(index + 1, 1);
    xs.splice(index + 1, 1);

    if (index > 0) index -= 1;
  }

  return {
    method: 'isotonic',
    sampleSize: samples.length,
    apply: (probability) => {
      if (xs.length === 0) return probability;
      if (probability <= (xs[0] as number)) return clampProbability(values[0] as number);
      if (probability >= (xs[xs.length - 1] as number)) return clampProbability(values[values.length - 1] as number);

      for (let i = 0; i < xs.length - 1; i += 1) {
        const left = xs[i] as number;
        const right = xs[i + 1] as number;
        if (probability >= left && probability <= right) {
          const span = right - left;
          const ratio = span === 0 ? 0 : (probability - left) / span;
          const interpolated = (values[i] as number) + ratio * ((values[i + 1] as number) - (values[i] as number));
          return clampProbability(interpolated);
        }
      }

      return clampProbability(probability);
    },
  };
}

export interface CalibrationReport {
  method: Calibrator['method'];
  sampleSize: number;
  before: { brier: number; logLoss: number; ece: number; mce: number };
  after: { brier: number; logLoss: number; ece: number; mce: number };
  improved: boolean;
  bins: ReliabilityBin[];
}

/**
 * Evaluates a calibrator on a held-out set.
 *
 * `improved` compares log loss before and after. A calibrator that does not
 * improve held-out log loss must not be adopted, however good its reliability
 * diagram looks.
 */
export function evaluateCalibrator(calibrator: Calibrator, holdout: LabelledProbability[]): CalibrationReport {
  const after = holdout.map((sample) => ({
    probability: calibrator.apply(sample.probability),
    occurred: sample.occurred,
  }));

  const beforeMetrics = {
    brier: brierScore(holdout),
    logLoss: logLoss(holdout),
    ece: expectedCalibrationError(holdout),
    mce: maxCalibrationError(holdout),
  };
  const afterMetrics = {
    brier: brierScore(after),
    logLoss: logLoss(after),
    ece: expectedCalibrationError(after),
    mce: maxCalibrationError(after),
  };

  return {
    method: calibrator.method,
    sampleSize: calibrator.sampleSize,
    before: beforeMetrics,
    after: afterMetrics,
    improved: afterMetrics.logLoss < beforeMetrics.logLoss,
    bins: reliabilityBins(after),
  };
}
