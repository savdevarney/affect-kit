import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // Builds a Worker with static assets (.svelte-kit/cloudflare). In `vite dev`,
    // `platform.env` comes from wrangler.jsonc through Wrangler's platform proxy.
    // The e2e tests run with CHECKIN_ENV=e2e (wrangler.jsonc › env.e2e) and
    // CHECKIN_STATE, a local D1 folder of their own, so they never touch the
    // log or the settings you're using.
    adapter: adapter({
      platformProxy: {
        ...(process.env.CHECKIN_ENV ? { environment: process.env.CHECKIN_ENV } : {}),
        persist: process.env.CHECKIN_STATE ? { path: process.env.CHECKIN_STATE } : true,
      },
    }),
  },
};
