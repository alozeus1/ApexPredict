// apps/web/scripts/capture-reel-stills.ts
import { chromium, type Browser, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const FRAMES: Array<{ id: string; slug: string }> = [
  { id: '01', slug: 'hero-dark' },
  { id: '02', slug: 'network-grid' },
  { id: '03', slug: 'prediction-card' },
  { id: '04', slug: 'methodology-stack' },
  { id: '05', slug: 'value-bet-chip' },
  { id: '06', slug: 'backtest-chart' },
  { id: '07', slug: 'dashboard-mobile' },
  { id: '08', slug: 'wordmark-end' },
];

const BASE = process.env.STILLS_BASE_URL ?? 'http://localhost:3000';
const OUT = join(process.cwd(), 'public/media/reel-stills');

async function captureFrame(page: Page, id: string, slug: string) {
  await page.goto(`${BASE}/en/dev/stills/${id}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  const handle = await page.waitForSelector(`#still-${id}`);
  const buf = await handle.screenshot({ omitBackground: false });
  const file = join(OUT, `${id}-${slug}.png`);
  await writeFile(file, buf);
  return { id, slug, file };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser: Browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 2160, height: 2160 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    locale: 'en',
    extraHTTPHeaders: { Cookie: 'apexpredix-region=US' },
  });
  const page = await ctx.newPage();
  const manifest: Array<{ id: string; slug: string; file: string }> = [];
  for (const f of FRAMES) {
    const m = await captureFrame(page, f.id, f.slug);
    manifest.push(m);
    console.log(`✓ ${m.id}-${m.slug}`);
  }
  await writeFile(join(OUT, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), base: BASE, frames: manifest }, null, 2));
  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
