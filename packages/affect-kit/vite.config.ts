import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Multi-entry library build. Each entry is a public export listed in
// package.json#exports. Anything in src/core, src/vocabulary, src/styles
// is bundled into these entries — never emitted as a separate file —
// which is how we keep the public API surface tight.
export default defineConfig({
  build: {
    lib: {
      entry: {
        index:  resolve(__dirname, 'src/index.ts'),
        rater:  resolve(__dirname, 'src/rater.ts'),
        result: resolve(__dirname, 'src/result.ts'),
        face:   resolve(__dirname, 'src/face.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['lit', /^lit\//],
      output: {
        preserveModules: false,
        entryFileNames: '[name].js',
      },
    },
    sourcemap: true,
    target: 'es2022',
    minify: false,
    emptyOutDir: true,
  },
});
