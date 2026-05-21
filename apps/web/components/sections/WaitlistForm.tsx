'use client';
import { useState } from 'react';
import { Input, Button } from '@apexpredix/ui';

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [eighteen, setEighteen] = useState(false);
  return (
    <form
      noValidate
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        // Phase 5 wires this up.
      }}
    >
      {/* honeypot — hidden from users + assistive tech but visible to bots */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label className="flex-1">
        <span className="sr-only">Email</span>
        <Input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-mute-1">
        <input
          type="checkbox"
          checked={eighteen}
          onChange={(e) => setEighteen(e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-ink-2"
          required
        />
        I am 18+
      </label>
      <Button type="submit" size="lg" disabled={!email || !eighteen}>
        Reserve my seat
      </Button>
    </form>
  );
}
