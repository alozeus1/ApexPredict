/**
 * Telegram alert dispatch stub. Live bot publishing wires through this helper
 * so suspended users never receive picks or alert nudges.
 */
import { isNotificationSuppressed, type NotificationSuppressibleUser } from '@/lib/audit';

export async function sendTelegramAlert(user: NotificationSuppressibleUser, send: () => Promise<void>) {
  if (isNotificationSuppressed(user)) return { suppressed: true };
  await send();
  return { suppressed: false };
}
