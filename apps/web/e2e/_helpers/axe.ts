// apps/web/e2e/_helpers/axe.ts
import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';

export async function axeSweep(page: Page) {
  return new AxeBuilder({ page }).withTags(['wcag2aa', 'wcag22aa']).analyze();
}
