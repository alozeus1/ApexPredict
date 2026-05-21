import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from './utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

const base =
  'inline-flex items-center justify-center font-medium rounded-xl transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-ink-0 ' +
  'disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  primary: 'bg-edge-cyan text-ink-0 hover:bg-cyan-300',
  secondary: 'bg-ink-2 text-white ring-1 ring-white/10 hover:bg-ink-3',
  ghost: 'bg-transparent text-white hover:bg-white/5',
  danger: 'bg-edge-red text-white hover:bg-red-600',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref as never} className={cn(base, variants[variant], sizes[size], className)} {...props} />;
  },
);
Button.displayName = 'Button';
