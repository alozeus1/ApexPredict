import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';
import { requireAdminBillingUser } from '@/lib/billing/auth';
import { importNpflOddsCsv } from '@/lib/odds/csv-import';

/**
 * Admin-only NPFL odds CSV upload endpoint. The importer validates all rows and
 * returns per-line errors without persisting invalid rows.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const admin = await requireAdminBillingUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
  }

  const result = await importNpflOddsCsv(await file.text());
  await logAudit(`user:${admin.id}`, 'admin.odds.upload', 'odds:npfl', { ...result });

  return NextResponse.json(result);
}
