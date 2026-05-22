import Link from 'next/link';

export function GeoBlockedScreen({ reason }: { reason: string }) {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Unavailable in your region</h1>
        <p className="mt-3 text-mute-1">
          ApexPredix AI is not available where you are. Region detected:{' '}
          <code className="rounded bg-ink-2 px-1 text-xs">{reason}</code>.
        </p>
        <p className="mt-3 text-mute-1">
          For jurisdictional inquiries write to{' '}
          <a className="text-edge-cyan hover:underline" href="mailto:legal@apexpredix.ai">
            legal@apexpredix.ai
          </a>
          .
        </p>
        <div className="mt-8">
          <Link href="/legal/disclaimer" className="text-sm text-edge-cyan hover:underline">
            Read the disclaimer
          </Link>
        </div>
      </div>
    </main>
  );
}
