import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importNpflOddsCsv } from '../csv-import';

interface StoredOdd {
  id: string;
  fixtureId: string;
  bookCode: string;
  market: string;
  price: number;
  capturedAt: Date;
}

function testClient() {
  const fixtures = new Map([
    [9001, { id: 'fixture_9001' }],
    [9002, { id: 'fixture_9002' }],
    [9003, { id: 'fixture_9003' }],
    [9004, { id: 'fixture_9004' }],
  ]);
  const odds: StoredOdd[] = [];

  return {
    odds,
    client: {
      fixture: {
        findUnique: async ({ where }: { where: { externalId: number } }) => fixtures.get(where.externalId) ?? null,
      },
      odds: {
        findFirst: async ({ where }: { where: { fixtureId: string; bookCode: string; market: string; capturedAt: Date } }) =>
          odds.find(
            (odd) =>
              odd.fixtureId === where.fixtureId &&
              odd.bookCode === where.bookCode &&
              odd.market === where.market &&
              odd.capturedAt.getTime() === where.capturedAt.getTime(),
          ) ?? null,
        create: async ({ data }: { data: Omit<StoredOdd, 'id'> }) => {
          odds.push({ id: `odd_${odds.length + 1}`, ...data });
          return odds.at(-1);
        },
        update: async ({ where, data }: { where: { id: string }; data: { price: number } }) => {
          const odd = odds.find((candidate) => candidate.id === where.id);
          if (odd) odd.price = data.price;
          return odd;
        },
      },
    },
  };
}

describe('importNpflOddsCsv', () => {
  it('imports the golden NPFL CSV and updates on idempotent re-upload', async () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const csv = fs.readFileSync(path.join(here, '../__fixtures__/npfl-odds.csv'), 'utf8');
    const db = testClient();

    await expect(importNpflOddsCsv(csv, db.client)).resolves.toEqual({ inserted: 20, updated: 0, errors: [] });
    expect(db.odds).toHaveLength(20);

    await expect(importNpflOddsCsv(csv.replace('2.05', '2.08'), db.client)).resolves.toEqual({
      inserted: 0,
      updated: 20,
      errors: [],
    });
    expect(db.odds).toHaveLength(20);
    expect(db.odds[0]?.price).toBe(2.08);
  });

  it('reports validation and missing-fixture errors without creating invalid rows', async () => {
    const db = testClient();
    const csv = [
      'fixture_external_id,bookmaker,market,price,captured_at',
      '9999,Bet9ja,1,2.05,2026-06-24T09:00:00.000Z',
      '9001,,1,-2,not-a-date',
    ].join('\n');

    const result = await importNpflOddsCsv(csv, db.client);

    expect(result.inserted).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.errors).toHaveLength(2);
    expect(db.odds).toHaveLength(0);
  });
});
