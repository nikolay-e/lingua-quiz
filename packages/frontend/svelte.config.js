import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'dist',
      assets: 'dist',
      fallback: 'index.html',
      precompress: false,
      strict: true,
    }),
    alias: {
      $lib: './src/lib',
      $stores: './src/stores',
      $components: './src/components',
      $api: './src/lib/api',
      $src: './src',
    },
    appDir: '_app',
  },
};

export default config;
