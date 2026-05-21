import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const BLOCKLIST_COUNTRIES = new Set(['CN','KP','IR','CU','SA','AE','SG','FR']);
const BLOCKLIST_US_STATES = new Set(['WA','ID','CT','TN','HI']);

const intlMiddleware = createIntlMiddleware(routing);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|media|dev|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|mp4|webm|vtt|css|js|json|woff2?)).*)'],
};

export function middleware(request: NextRequest) {
  if (process.env.COMPLIANCE_GEOFENCE_ENABLED === 'true') {
    const country = (request.headers.get('x-vercel-ip-country') ?? '').toUpperCase();
    const state = (request.headers.get('x-vercel-ip-country-region') ?? '').toUpperCase();
    const blocked = BLOCKLIST_COUNTRIES.has(country) || (country === 'US' && BLOCKLIST_US_STATES.has(state));
    if (blocked && !request.nextUrl.pathname.match(/\/(blocked|under-age|legal\/)/)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${routing.defaultLocale}/blocked`;
      const res = NextResponse.rewrite(url, { status: 451 });
      res.headers.set('x-blocked-reason', country === 'US' ? `US-${state}` : country);
      return res;
    }
  }
  return intlMiddleware(request);
}
