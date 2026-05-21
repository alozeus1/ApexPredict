import * as React from 'react';
import { cn } from './utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'h-11 w-full rounded-xl bg-ink-2 px-4 text-sm text-white placeholder:text-mute-1',
        'ring-1 ring-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-cyan',
        'disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
