'use client';
import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';
import { useEffect, useState } from 'react';

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(m.matches);
    const on = (e: MediaQueryListEvent) => setReduce(e.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion={reduce ? 'always' : 'never'}>{children}</MotionConfig>
    </LazyMotion>
  );
}
