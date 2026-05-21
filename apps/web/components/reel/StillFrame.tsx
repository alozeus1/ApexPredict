import type { ReactNode } from 'react';

interface Props { children: ReactNode; id: string; }

export function StillFrame({ children, id }: Props) {
  return (
    <div className="grid min-h-dvh place-items-center bg-ink-0">
      <div id={`still-${id}`} data-testid="still-frame" className="grid h-[1080px] w-[1080px] place-items-center overflow-hidden rounded-3xl bg-ink-0 ring-1 ring-white/5">
        <div className="grid h-full w-full place-items-center p-12">{children}</div>
      </div>
    </div>
  );
}
