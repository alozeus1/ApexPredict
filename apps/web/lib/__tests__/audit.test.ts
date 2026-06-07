import { describe, it, expect, vi, beforeEach } from 'vitest';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('@apexpredix/db', () => ({ prisma: { auditLog: { create } } }));

import { logAudit } from '../audit';

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue({});
});

describe('logAudit', () => {
  it.each([
    'auth.signup',
    'auth.login.success',
    'auth.login.fail',
    'auth.logout',
    'auth.lockout',
    'auth.password.reset',
  ])('writes an audit row for %s', async (action) => {
    await logAudit('user:123', action, 'user:123', { ip: 'hash' });
    expect(create).toHaveBeenCalledWith({
      data: { actor: 'user:123', action, target: 'user:123', meta: { ip: 'hash' } },
    });
  });

  it('defaults meta to an empty object', async () => {
    await logAudit('system:daily-refresh', 'job.run', 'daily-refresh');
    expect(create).toHaveBeenCalledWith({
      data: { actor: 'system:daily-refresh', action: 'job.run', target: 'daily-refresh', meta: {} },
    });
  });

  it('uses a provided transaction client instead of the shared one', async () => {
    const txCreate = vi.fn().mockResolvedValue({});
    await logAudit('admin:1', 'user.disable', 'user:9', { reason: 'fraud' }, {
      auditLog: { create: txCreate },
    } as never);
    expect(txCreate).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
  });
});
