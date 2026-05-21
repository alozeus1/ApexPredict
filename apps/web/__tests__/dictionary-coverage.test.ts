import { describe, it, expect } from 'vitest';
import en from '../messages/en.json';
import es from '../messages/es.json';
import yo from '../messages/yo.json';
import ha from '../messages/ha.json';
import zu from '../messages/zu.json';

const flatten = (obj: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? flatten(v as Record<string, unknown>, prefix ? `${prefix}.${k}` : k)
      : [`${prefix ? `${prefix}.${k}` : k}`],
  );

describe('dictionary coverage', () => {
  const enKeys = flatten(en).sort();
  it.each([['es', es], ['yo', yo], ['ha', ha], ['zu', zu]] as const)(
    '%s has every EN key',
    (_, dict) => {
      const keys = flatten(dict).sort();
      expect(keys).toEqual(enKeys);
    },
  );
});
