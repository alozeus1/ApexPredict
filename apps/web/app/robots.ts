import type { MetadataRoute } from 'next';
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://apexpredix.ai';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/*/blocked', '/*/under-age', '/dev/'] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
