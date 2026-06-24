import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelfExcludeModal } from '../SelfExcludeModal';

describe('SelfExcludeModal', () => {
  it('walks keyboard users through the three locked confirmation steps', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ selfExcludedUntil: '2026-06-25T00:00:00.000Z' }), { status: 200 })));
    render(<SelfExcludeModal />);

    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Self-exclusion confirmation' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Confirm self-exclusion' }));

    expect(await screen.findByText(/Self-exclusion active until/)).toBeInTheDocument();
  });
});
