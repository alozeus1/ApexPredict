import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { HeroReel } from '../HeroReel';

describe('HeroReel', () => {
  it('renders an autoplay muted video with an unmute toggle', () => {
    render(<HeroReel />);
    const video = screen.getByLabelText(/product preview/i) as HTMLVideoElement;
    expect(video).toBeInstanceOf(HTMLVideoElement);
    expect(video.muted).toBe(true);
    expect(screen.getByRole('button', { name: /unmute/i })).toBeInTheDocument();
  });

  it('toggles mute when the button is clicked', async () => {
    render(<HeroReel />);
    const btn = screen.getByRole('button', { name: /unmute/i });
    await userEvent.click(btn);
    expect(screen.getByRole('button', { name: /mute/i })).toBeInTheDocument();
  });
});
