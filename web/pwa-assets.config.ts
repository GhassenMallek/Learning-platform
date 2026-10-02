import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

const BRAND = '#4258e8'; // brand-600, same as the logo tile

/** Generates every PWA icon from public/favicon.svg:  npm run icons -w web */
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // Maskable and iOS icons are cropped/rounded by the OS: fill the canvas with the brand colour so the
    // rounded logo tile blends into a full square and the glyph stays inside the safe zone.
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: BRAND, fit: 'contain' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: BRAND, fit: 'contain' } },
  },
  images: ['public/favicon.svg'],
});
