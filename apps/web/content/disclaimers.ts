/**
 * Canonical compliance + disclaimer copy, reused across email, Telegram, and UI.
 *
 * Positioning is fixed: ApexPredict is a calibrated value-bet signal service, not an
 * oracle. No copy here may promise outcomes or an ROI figure as a future result.
 */

/** Short compliance line for UI surfaces (hero, dashboard, cards). */
export const COMPLIANCE_FOOTER =
  'ApexPredict is a sports prediction analytics service. We are not a bookmaker. 18+ only. ' +
  'Past performance does not guarantee future results.';

/** Email footer. Pairs the analytics-service disclosure with unsubscribe + RG links. */
export const EMAIL_FOOTER =
  'ApexPredict is a sports prediction analytics service. We are not a bookmaker. 18+ only. ' +
  'If you no longer wish to receive these emails, unsubscribe. ' +
  'Need a break? Visit our responsible-gaming page.';

/** Telegram bot bio. */
export const TELEGRAM_BIO =
  'Calibrated football pick signals from ApexPredict. Decision support — we don’t promise wins. 18+.';

/** Per-pick disclaimer line — appended to every published pick (Telegram, email, UI). */
export const PER_PICK_DISCLAIMER = '18+. Decision support only.';

export interface PickDisclosure {
  /** Model probability, formatted, e.g. "61%". */
  modelProbability: string;
  /** Best available price, e.g. "2.10". */
  bestPrice: string;
  /** Bookmaker offering the best price, e.g. "Bet9ja". */
  book: string;
  /** Edge vs. market, formatted, e.g. "+4.2%". */
  edge: string;
  /** Confidence band, e.g. "Medium". */
  confidenceBand: string;
}

/**
 * Render a per-pick disclosure block (model probability, best price + book, edge,
 * confidence band) always terminated by the per-pick disclaimer. Used by the
 * Telegram bot and any UI/email that publishes a pick.
 */
export function renderPickDisclosure(d: PickDisclosure): string {
  return [
    `Model probability: ${d.modelProbability}`,
    `Best price: ${d.bestPrice} (${d.book})`,
    `Edge vs. market: ${d.edge}`,
    `Confidence: ${d.confidenceBand}`,
    PER_PICK_DISCLAIMER,
  ].join('\n');
}
