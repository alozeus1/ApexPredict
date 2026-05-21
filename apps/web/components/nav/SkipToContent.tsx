export function SkipToContent() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50
                 focus:rounded-xl focus:bg-edge-cyan focus:px-4 focus:py-2 focus:text-ink-0
                 focus:outline-none focus:ring-2 focus:ring-edge-cyan focus:ring-offset-2 focus:ring-offset-ink-0"
    >
      Skip to content
    </a>
  );
}
