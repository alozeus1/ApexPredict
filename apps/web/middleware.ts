import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { isBlocked } from './lib/compliance/blocklist';

const intlMiddleware = createIntlMiddleware(routing);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|media|dev|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|mp4|webm|vtt|css|js|json|woff2?)).*)'],
};

function buildCsp(nonce: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `media-src 'self'`,
    `font-src 'self' data:`,
    `connect-src 'self' https://vitals.vercel-insights.com https://*.ingest.sentry.io https://challenges.cloudflare.com`,
    `frame-src https://challenges.cloudflare.com`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `report-uri /api/csp-report`,
  ].join('; ');
}

export function middleware(request: NextRequest) {
  if (process.env.COMPLIANCE_GEOFENCE_ENABLED === 'true') {
    const country = (request.headers.get('x-vercel-ip-country') ?? '').toUpperCase();
    const state = (request.headers.get('x-vercel-ip-country-region') ?? '').toUpperCase();
    if (isBlocked(country, state) && !request.nextUrl.pathname.match(/\/(blocked|under-age|legal\/)/)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${routing.defaultLocale}/blocked`;
      const res = NextResponse.rewrite(url, { status: 451 });
      res.headers.set('x-blocked-reason', country === 'US' ? `US-${state}` : country);
      return res;
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const response = intlMiddleware(request);
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  response.headers.set('x-nonce', nonce);
  return response;
}
