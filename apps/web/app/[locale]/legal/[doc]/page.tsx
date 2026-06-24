import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { pageMetadata } from '@/lib/seo';
import { Sidebar } from '@/components/nav/Sidebar';
import { MobileNav } from '@/components/nav/MobileNav';
import { Footer } from '@/components/Footer';

const DOCS = ['privacy', 'terms', 'cookies', 'disclaimer'] as const;
type Doc = (typeof DOCS)[number];

export function generateStaticParams() {
  return DOCS.map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; doc: string }> }) {
  const { locale, doc } = await params;
  const titles: Record<Doc, string> = {
    privacy: 'Privacy Policy', terms: 'Terms of Use', cookies: 'Cookie Policy', disclaimer: 'Responsible Use Disclaimer',
  };
  if (!(DOCS as readonly string[]).includes(doc)) return {};
  return pageMetadata({ locale, path: `/legal/${doc}`, title: `${titles[doc as Doc]} — ApexPredict AI`, description: `${titles[doc as Doc]} for ApexPredict AI by Maralito Labs.` });
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string; doc: string }> }) {
  const { locale, doc } = await params;
  setRequestLocale(locale);
  if (!(DOCS as readonly string[]).includes(doc)) notFound();
  const Doc = (await import(`@/content/legal/${doc}.mdx`)).default;
  return (
    <>
      <Sidebar pathname={`/legal/${doc}`} />
      <MobileNav pathname={`/legal/${doc}`} />
      <main id="main" className="lg:pl-64">
        <article className="prose mx-auto max-w-3xl px-6 py-16">
          <Doc />
        </article>
        <Footer />
      </main>
    </>
  );
}
