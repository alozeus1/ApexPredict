'use client';
import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { decodeChoices, COOKIE_NAME } from '@/lib/compliance/consent';

export function ConsentedAnalytics() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const raw = document.cookie.split('; ').find((p) => p.startsWith(`${COOKIE_NAME}=`))?.split('=')[1];
    const c = decodeChoices(raw);
    setOk(c?.analytics === true);
  }, []);
  if (!ok) return null;
  return (<><Analytics /><SpeedInsights /></>);
}
