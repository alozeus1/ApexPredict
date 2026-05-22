import { headers } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';
import { GeoBlockedScreen } from '@/components/compliance/GeoBlockedScreen';

export default async function BlockedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const h = await headers();
  const reason = h.get('x-blocked-reason') ?? 'unknown';
  return <GeoBlockedScreen reason={reason} />;
}
