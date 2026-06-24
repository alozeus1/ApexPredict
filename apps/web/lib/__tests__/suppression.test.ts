import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isNotificationSuppressed } from '../audit';
import { sendEmailDigest } from '../notifications/email-digest';
import { sendTelegramAlert } from '../notifications/telegram-bot';

describe('notification suppression', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-24T00:00:00Z'));
  });

  it('suppresses disabled and actively self-excluded users', () => {
    expect(isNotificationSuppressed({ disabledAt: new Date() })).toBe(true);
    expect(isNotificationSuppressed({ rgFlags: { selfExcludedUntil: '2026-06-25T00:00:00.000Z' } })).toBe(true);
    expect(isNotificationSuppressed({ rgFlags: { selfExcludedUntil: '2026-06-23T00:00:00.000Z' } })).toBe(false);
  });

  it('prevents email digest and Telegram sends for suspended users', async () => {
    const send = vi.fn();
    const user = { rgFlags: { selfExcludedUntil: '2026-06-25T00:00:00.000Z' } };

    await expect(sendEmailDigest(user, send)).resolves.toEqual({ suppressed: true });
    await expect(sendTelegramAlert(user, send)).resolves.toEqual({ suppressed: true });
    expect(send).not.toHaveBeenCalled();
  });
});
