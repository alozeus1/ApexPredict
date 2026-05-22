import { setRequestLocale } from 'next-intl/server';

export default async function UnderAge({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">Come back when you are 18+</h1>
        <p className="mt-3 text-mute-1">
          ApexPredix AI is intended for adults only. If you or someone you know has a gambling problem, help is
          available at{' '}
          <a
            className="text-edge-cyan hover:underline"
            href="https://www.begambleaware.org/"
            rel="noopener noreferrer"
            target="_blank"
          >
            BeGambleAware
          </a>
          .
        </p>
      </div>
    </main>
  );
}
