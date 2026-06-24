/**
 * NPFL odds CSV importer for admin-uploaded bookmaker prices. Imports are
 * idempotent by fixture, bookmaker, market, and capture timestamp.
 */
import { prisma } from '@apexpredix/db';
import { z } from 'zod';

const rowSchema = z.object({
  fixture_external_id: z.coerce.number().int().positive(),
  bookmaker: z.string().trim().min(1),
  market: z.string().trim().min(1),
  price: z.coerce.number().positive(),
  captured_at: z.string().datetime(),
});

export interface OddsImportResult {
  inserted: number;
  updated: number;
  errors: Array<{ line: number; message: string }>;
}

interface OddsImportClient {
  fixture: {
    findUnique(args: { where: { externalId: number }; select: { id: true } }): Promise<{ id: string } | null>;
  };
  odds: {
    findFirst(args: {
      where: { fixtureId: string; bookCode: string; market: string; capturedAt: Date };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    create(args: { data: { fixtureId: string; bookCode: string; market: string; price: number; capturedAt: Date } }): Promise<unknown>;
    update(args: { where: { id: string }; data: { price: number } }): Promise<unknown>;
  };
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function rowsFromCsv(csv: string) {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const headers = parseCsvLine(lines[0] ?? '');
  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line);
    return {
      line: index + 2,
      raw: Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ''])),
    };
  });
}

export async function importNpflOddsCsv(
  csv: string,
  client: OddsImportClient = prisma,
): Promise<OddsImportResult> {
  const result: OddsImportResult = { inserted: 0, updated: 0, errors: [] };

  for (const row of rowsFromCsv(csv)) {
    const parsed = rowSchema.safeParse(row.raw);
    if (!parsed.success) {
      result.errors.push({ line: row.line, message: parsed.error.issues.map((issue) => issue.message).join('; ') });
      continue;
    }

    const fixture = await client.fixture.findUnique({
      where: { externalId: parsed.data.fixture_external_id },
      select: { id: true },
    });
    if (!fixture) {
      result.errors.push({ line: row.line, message: `Fixture ${parsed.data.fixture_external_id} not found` });
      continue;
    }

    const capturedAt = new Date(parsed.data.captured_at);
    const bookCode = parsed.data.bookmaker;
    const existing = await client.odds.findFirst({
      where: { fixtureId: fixture.id, bookCode, market: parsed.data.market, capturedAt },
      select: { id: true },
    });

    if (existing) {
      await client.odds.update({ where: { id: existing.id }, data: { price: parsed.data.price } });
      result.updated += 1;
    } else {
      await client.odds.create({
        data: {
          fixtureId: fixture.id,
          bookCode,
          market: parsed.data.market,
          price: parsed.data.price,
          capturedAt,
        },
      });
      result.inserted += 1;
    }
  }

  return result;
}
