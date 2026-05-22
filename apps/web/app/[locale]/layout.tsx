import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { cookies } from 'next/headers';
import { SkipToContent } from '@/components/nav/SkipToContent';
import { ThemeScript } from '@/components/nav/theme-script';
import { AgeGate } from '@/components/compliance/AgeGate';
import { RGSBanner } from '@/components/compliance/RGSBanner';
import type { RegionCode } from '@apexpredix/types';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'ApexPredix AI — Sports Prediction Intelligence',
  description: 'AI sports prediction intelligence by Maralito Labs — ELO + Poisson + xG ensemble engine.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0A0A0A',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  setRequestLocale(locale);
  const cookieStore = await cookies();
  const region = (cookieStore.get('apexpredix-region')?.value ?? 'US') as RegionCode;
  const messages = (await import(`@/messages/${locale}.json`)).default;
  return (
    <html lang={locale} className={inter.variable}>
      <head>
        <ThemeScript />
      </head>
      <body className="font-sans antialiased">
        <SkipToContent />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AgeGate />
          <RGSBanner region={region} />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
