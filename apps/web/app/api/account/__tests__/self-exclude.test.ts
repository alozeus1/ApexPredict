import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../self-exclude/route';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@apexpredix/db', () => ({
  prisma: {
    user: { findUnique: mocks.findUnique },
    $transaction: mocks.transaction,
  },
}));
vi.mock('@/lib/audit', () => ({ logAudit: mocks.logAudit }));

describe('POST /api/account/self-exclude', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-24T00:00:00Z'));
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { email: 'user@example.com' } });
    mocks.findUnique.mockResolvedValue({ id: 'user_1', rgFlags: {} });
    mocks.transaction.mockImplementation(async (callback) => callback({ user: { update: mocks.update } }));
  });

  it('sets selfExcludedUntil and audits the start', async () => {
    const response = await POST(
      new Request('http://localhost/api/account/self-exclude', {
        method: 'POST',
        body: JSON.stringify({ window: '24h' }),
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.selfExcludedUntil).toBe('2026-06-25T00:00:00.000Z');
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user_1' },
      data: { rgFlags: { selfExcludedUntil: '2026-06-25T00:00:00.000Z' } },
    }));
    expect(mocks.logAudit).toHaveBeenCalledWith(
      'user:user_1',
      'rg.selfExclude.start',
      'user:user_1',
      expect.objectContaining({ window: '24h' }),
      expect.any(Object),
    );
  });

  it('rejects changes during an active window', async () => {
    mocks.findUnique.mockResolvedValueOnce({
      id: 'user_1',
      rgFlags: { selfExcludedUntil: '2026-06-25T00:00:00.000Z' },
    });

    const response = await POST(
      new Request('http://localhost/api/account/self-exclude', {
        method: 'POST',
        body: JSON.stringify({ window: '7d' }),
      }),
    );

    expect(response.status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
