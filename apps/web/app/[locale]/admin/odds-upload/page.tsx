import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { requireAdminBillingUser } from '@/lib/billing/auth';
import { OddsUploadForm } from './OddsUploadForm';

/**
 * Admin-only NPFL odds upload page.
 */
export const dynamic = 'force-dynamic';

export default async function OddsUploadPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const admin = await requireAdminBillingUser();
  if (!admin) redirect(`/${locale}/login` as Route);

  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm uppercase tracking-[0.16em] text-edge-cyan">Admin</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">NPFL odds upload</h1>
      <p className="mt-3 text-sm text-mute-1">
        Upload fixture odds with fixture_external_id, bookmaker, market, price, and captured_at columns.
      </p>
      <OddsUploadForm />
    </main>
  );
}
