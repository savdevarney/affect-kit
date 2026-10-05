import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // Builds a Worker with static assets (.svelte-kit/cloudflare). In `vite dev`,
    // `platform.env` comes from wrangler.jsonc through Wrangler's platform proxy.
    adapter: adapter(),
  },
};
