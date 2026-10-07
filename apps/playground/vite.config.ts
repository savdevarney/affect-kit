import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Alias affect-kit subpath imports to the package source directly,
// so the playground hot-reloads when we edit component source — no
// build step required during development.
export default defineConfig({
  resolve: {
    alias: {
      'affect-kit/rater':   resolve(__dirname, '../../packages/affect-kit/src/rater.ts'),
      'affect-kit/result':  resolve(__dirname, '../../packages/affect-kit/src/result.ts'),
      'affect-kit/face':    resolve(__dirname, '../../packages/affect-kit/src/face.ts'),
      'affect-kit/compare': resolve(__dirname, '../../packages/affect-kit/src/compare.ts'),
      'affect-kit/chip':    resolve(__dirname, '../../packages/affect-kit/src/chip.ts'),
      'affect-kit/pad':     resolve(__dirname, '../../packages/affect-kit/src/pad.ts'),
      'affect-kit/data':    resolve(__dirname, '../../packages/affect-kit/src/data.ts'),
      'affect-kit':         resolve(__dirname, '../../packages/affect-kit/src/index.ts'),
    },
  },
});
