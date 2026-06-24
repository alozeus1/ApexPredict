/**
 * Email digest dispatch stub. Live digest scheduling wires through this helper
 * so responsible-gaming suppression is applied before any send attempt.
 */
import { isNotificationSuppressed, type NotificationSuppressibleUser } from '@/lib/audit';

export async function sendEmailDigest(user: NotificationSuppressibleUser, send: () => Promise<void>) {
  if (isNotificationSuppressed(user)) return { suppressed: true };
  await send();
  return { suppressed: false };
}
