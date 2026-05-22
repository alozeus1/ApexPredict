import { setRequestLocale } from 'next-intl/server';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; r?: string }>;
}

export default async function ThankYou({ params, searchParams }: Props) {
  const { locale } = await params;
  const { status, r } = await searchParams;
  setRequestLocale(locale);
  const ok = status === 'ok';
  const referralUrl = r ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/?r=${r}` : null;
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-md">
        {ok ? (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">You are on the list.</h1>
            <p className="mt-3 text-mute-1">Move up the queue by sharing your link:</p>
            {referralUrl && (
              <div className="mt-4 rounded-xl bg-ink-2 p-3 ring-1 ring-white/10">
                <code className="break-all text-sm text-edge-cyan">{referralUrl}</code>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">This link is no longer valid</h1>
            <p className="mt-3 text-mute-1">
              Either it expired or it was already used. Drop your email again and we will resend.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
