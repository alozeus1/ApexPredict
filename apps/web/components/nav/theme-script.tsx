export function ThemeScript({ nonce }: { nonce?: string }) {
  const code = `
    try {
      var t = localStorage.getItem('apexpredix-theme');
      var m = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var dark = t ? t === 'dark' : m;
      if (dark) document.documentElement.classList.add('dark');
    } catch(e) {}
  `;
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: code }} />;
}
