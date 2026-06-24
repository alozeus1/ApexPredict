import { describe, expect, it, vi } from 'vitest';
import { POST } from '../route';

vi.mock('@/lib/billing/auth', () => ({ requireAdminBillingUser: vi.fn(async () => null) }));
vi.mock('@/lib/odds/csv-import', () => ({ importNpflOddsCsv: vi.fn() }));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

describe('POST /api/admin/odds/upload', () => {
  it('returns 403 for non-admin users', async () => {
    const request = new Request('http://localhost/api/admin/odds/upload', { method: 'POST', body: new FormData() });
    const response = await POST(request);

    expect(response.status).toBe(403);
  });
});
