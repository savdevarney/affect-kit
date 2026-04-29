import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Single-entry library build. The wrapper module re-exports four typed
// React components (Rater, Result, Face, Compare) plus the Rating type.
// affect-kit and react/lit are externalised — consumers bring their own.
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: [
        'react',
        'react/jsx-runtime',
        '@lit/react',
        'affect-kit',
        /^affect-kit\//,
      ],
    },
    sourcemap: true,
    target: 'es2022',
    minify: false,
    emptyOutDir: true,
  },
});
