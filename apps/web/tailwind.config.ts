import type { Config } from 'tailwindcss';
import preset from '@apexpredix/config/tailwind';

const config: Config = {
  presets: [preset as Config],
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
