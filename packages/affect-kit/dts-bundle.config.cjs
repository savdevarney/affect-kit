/**
 * dts-bundle-generator config.
 *
 * Produces one flat .d.ts per public entry by inlining all internal types.
 * Mirrors the JS multi-entry build in vite.config.ts.
 *
 * - `noCheck: true` skips re-running tsc semantics; we already typecheck
 *   in CI via `pnpm typecheck`.
 * - `inlineDeclareGlobals: false` keeps Lit's HTMLElementTagNameMap merges
 *   in their original `declare global` form so consumers see the augmented
 *   typings without surprises.
 */
const entry = (file) => ({
  filePath: `./src/${file}.ts`,
  outFile: `./dist/${file}.d.ts`,
  noCheck: true,
  output: {
    inlineDeclareGlobals: false,
    sortNodes: false,
    exportReferencedTypes: false,
    noBanner: true,
  },
});

module.exports = {
  compilationOptions: {
    preferredConfigPath: './tsconfig.dts.json',
  },
  entries: [
    entry('index'),
    entry('rater'),
    entry('result'),
    entry('face'),
    entry('compare'),
  ],
};
