import { PROVIDERS, getProvider } from './providers';
import type { ProviderDefinition, RequiredRight, RightsStatus } from './types';

/**
 * Rights enforcement.
 *
 * The registry is only useful if something reads it. These helpers turn
 * recorded rights into runtime and release-gate decisions.
 *
 * Design rule: UNKNOWN is treated exactly like DENIED at the point of use.
 * Optimism about unread terms is how a product ends up redistributing data it
 * has no licence to redistribute.
 */

export class ProviderRightsError extends Error {
  readonly providerId: string;
  readonly right: RequiredRight;
  readonly status: RightsStatus;

  constructor(providerId: string, right: RequiredRight, status: RightsStatus) {
    super(
      `Provider "${providerId}" does not have a confirmed ${right} right (status: ${status}). ` +
        `Review the vendor terms and record evidence in the registry before using this data for that purpose.`,
    );
    this.name = 'ProviderRightsError';
    this.providerId = providerId;
    this.right = right;
    this.status = status;
  }
}

/** True only for an explicitly GRANTED right. CONDITIONAL and UNKNOWN are not permission. */
export function hasRight(provider: ProviderDefinition, right: RequiredRight): boolean {
  return provider.licensing[right] === 'GRANTED';
}

/** Throws unless the right is explicitly granted. Use at the point of use, not at startup. */
export function assertRight(providerId: string, right: RequiredRight): void {
  const provider = getProvider(providerId);
  if (!provider) throw new ProviderRightsError(providerId, right, 'UNKNOWN');

  const status = provider.licensing[right];
  if (status !== 'GRANTED') throw new ProviderRightsError(providerId, right, status);
}

/** Non-throwing form for callers that degrade rather than fail. */
export function checkRight(providerId: string, right: RequiredRight): { allowed: boolean; reason?: string } {
  const provider = getProvider(providerId);
  if (!provider) return { allowed: false, reason: `unknown provider "${providerId}"` };

  const status = provider.licensing[right];
  return status === 'GRANTED'
    ? { allowed: true }
    : { allowed: false, reason: `${right} is ${status} for ${providerId}` };
}

export interface RightsGateFinding {
  providerId: string;
  displayName: string;
  enabled: boolean;
  unresolvedRights: Array<{ right: RequiredRight; status: RightsStatus }>;
  verification: string;
}

const ALL_RIGHTS: RequiredRight[] = [
  'storage',
  'modelTraining',
  'derivedCommercialOutput',
  'displayRedistribution',
];

/**
 * Release-gate report.
 *
 * Any enabled provider with an unresolved right blocks a market-ready
 * declaration. Disabled providers are reported but do not block, since we are
 * not using their data.
 */
export function rightsGateReport(): {
  blocking: RightsGateFinding[];
  nonBlocking: RightsGateFinding[];
  passes: boolean;
} {
  const findings: RightsGateFinding[] = PROVIDERS.map((provider) => ({
    providerId: provider.id,
    displayName: provider.displayName,
    enabled: provider.enabled,
    verification: provider.licensing.verification,
    unresolvedRights: ALL_RIGHTS.filter((right) => provider.licensing[right] !== 'GRANTED').map((right) => ({
      right,
      status: provider.licensing[right],
    })),
  })).filter((finding) => finding.unresolvedRights.length > 0);

  const blocking = findings.filter((finding) => finding.enabled);
  const nonBlocking = findings.filter((finding) => !finding.enabled);

  return { blocking, nonBlocking, passes: blocking.length === 0 };
}

/** Providers whose configured env vars are all present. Values are never read or logged. */
export function configuredProviders(): string[] {
  return PROVIDERS.filter(
    (provider) => provider.envVars.length > 0 && provider.envVars.every((name) => Boolean(process.env[name])),
  ).map((provider) => provider.id);
}
