import { describe, expect, it } from 'vitest';
import { PROVIDERS, enabledProviders, getProvider } from '../providers';
import { ProviderRightsError, assertRight, checkRight, hasRight, rightsGateReport } from '../rights';
import type { ProviderDefinition } from '../types';

function withRights(overrides: Partial<ProviderDefinition['licensing']>): ProviderDefinition {
  const base = getProvider('api-sports') as ProviderDefinition;
  return { ...base, licensing: { ...base.licensing, ...overrides } };
}

describe('registry integrity', () => {
  it('never stores credential values, only env var names', () => {
    for (const provider of PROVIDERS) {
      for (const name of provider.envVars) {
        expect(name).toMatch(/^[A-Z0-9_]+$/);
        // A real key would not look like an env var name.
        expect(name.length).toBeLessThan(64);
      }
    }
  });

  it('gives every provider a reliability and quota policy', () => {
    for (const provider of PROVIDERS) {
      expect(provider.reliability.timeoutMs).toBeGreaterThan(0);
      expect(provider.reliability.maxRetries).toBeGreaterThanOrEqual(0);
      expect(provider.quota.reservePct).toBeGreaterThanOrEqual(0);
      expect(provider.quota.reservePct).toBeLessThan(1);
    }
  });

  it('has unique provider ids', () => {
    const ids = PROVIDERS.map((provider) => provider.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only enables providers that are actually integrated', () => {
    // OpticOdds and TheRundown have no contract and no adapter — they must not
    // be enabled, or the rights gate would block on feeds we do not even call.
    expect(enabledProviders().map((provider) => provider.id)).not.toContain('opticodds');
    expect(enabledProviders().map((provider) => provider.id)).not.toContain('therundown');
  });
});

describe('rights enforcement', () => {
  it('treats UNKNOWN as denial, not permission', () => {
    expect(hasRight(withRights({ modelTraining: 'UNKNOWN' }), 'modelTraining')).toBe(false);
  });

  it('treats CONDITIONAL as denial until resolved', () => {
    // Conditional rights depend on terms we have not encoded, so they cannot be
    // auto-granted at a call site.
    expect(hasRight(withRights({ storage: 'CONDITIONAL' }), 'storage')).toBe(false);
  });

  it('allows only an explicit GRANTED right', () => {
    expect(hasRight(withRights({ displayRedistribution: 'GRANTED' }), 'displayRedistribution')).toBe(true);
  });

  it('throws for an unreviewed provider right', () => {
    expect(() => assertRight('api-sports', 'modelTraining')).toThrow(ProviderRightsError);
  });

  it('throws for an unknown provider rather than defaulting to allowed', () => {
    expect(() => assertRight('does-not-exist', 'storage')).toThrow(ProviderRightsError);
  });

  it('reports a reason without throwing when asked to check', () => {
    const result = checkRight('api-sports', 'derivedCommercialOutput');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('UNKNOWN');
  });
});

describe('release gate', () => {
  it('currently fails, because no provider terms have been reviewed', () => {
    // This test is expected to FAIL-as-in-report until rights are recorded.
    // When it starts passing, that is a real change in release readiness.
    const report = rightsGateReport();
    expect(report.passes).toBe(false);
    expect(report.blocking.length).toBeGreaterThan(0);
  });

  it('blocks on enabled providers and merely notes disabled ones', () => {
    const report = rightsGateReport();
    for (const finding of report.blocking) expect(finding.enabled).toBe(true);
    for (const finding of report.nonBlocking) expect(finding.enabled).toBe(false);
  });

  it('names every unresolved right so the gap is actionable', () => {
    const report = rightsGateReport();
    const footballData = report.blocking.find((finding) => finding.providerId === 'football-data');
    expect(footballData?.unresolvedRights.map((entry) => entry.right)).toEqual(
      expect.arrayContaining(['storage', 'modelTraining', 'derivedCommercialOutput', 'displayRedistribution']),
    );
  });
});
