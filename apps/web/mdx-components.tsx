import type { MDXComponents } from 'mdx/types';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (p) => <h1 className="mt-12 text-3xl font-semibold" {...p} />,
    h2: (p) => <h2 className="mt-10 text-2xl font-semibold" {...p} />,
    h3: (p) => <h3 className="mt-6 text-lg font-semibold" {...p} />,
    p: (p) => <p className="mt-3 text-mute-1 leading-relaxed" {...p} />,
    ul: (p) => <ul className="mt-3 list-disc pl-6 text-mute-1" {...p} />,
    a: (p) => <a className="text-edge-cyan hover:underline" {...p} />,
    ...components,
  };
}
