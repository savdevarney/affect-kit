// Checks the built headless entries, after `vite build`.
//
// - No DOM: dist/core.js and dist/apple-health.js must import nothing from Lit
//   and touch no browser global, so React Native, servers and workers can load them.
// - Worklets: React Native Reanimated runs a function on the UI thread only if
//   it starts with a 'worklet' directive. The build must keep them (no minifier
//   that strips directives), so every one in the source must reach dist/core.js.
//
// Run by `pnpm build`; it exits non-zero on a problem.

import { readFileSync, readdirSync } from 'node:fs';

const fail = (message) => {
  console.error(`check-dist: ${message}`);
  process.exitCode = 1;
};

const DOM_GLOBALS = /\b(customElements|HTMLElement|document\.|window\.|matchMedia|requestAnimationFrame)\b/;
const dist = (file) => readFileSync(new URL(`../dist/${file}`, import.meta.url), 'utf8');

// An entry is a few re-exports; the code lives in shared chunks it imports.
function reachable(file, seen = new Set()) {
  if (seen.has(file)) return seen;
  seen.add(file);
  for (const [, next] of dist(file).matchAll(/from\s+["']\.\/([^"']+)["']/g)) reachable(next, seen);
  return seen;
}

const coreFiles = reachable('core.js');
for (const entry of ['core.js', 'apple-health.js']) {
  for (const file of reachable(entry)) {
    const code = dist(file);
    if (/from\s+["']lit(\/[^"']*)?["']/.test(code)) fail(`${entry} reaches ${file}, which imports Lit`);
    const dom = code.match(DOM_GLOBALS);
    if (dom) fail(`${entry} reaches ${file}, which mentions ${dom[0]}`);
  }
}

// Every function that's a worklet in the source must still be one in the
// core's built files, if the core uses it (Rollup drops what no export reaches).
const WORKLET_FN = /function\s+(\w+)\s*\([^{]*\{\s*["']worklet["']/g;
const srcDir = new URL('../src/core/', import.meta.url);
// In TypeScript a return type can hold braces, so each directive is matched to
// the nearest function declared before it instead.
const worklets = new Set();
for (const file of readdirSync(srcDir)) {
  const source = readFileSync(new URL(file, srcDir), 'utf8');
  for (const directive of source.matchAll(/^\s*["']worklet["'];/gm)) {
    const before = [...source.slice(0, directive.index).matchAll(/function\s+(\w+)\s*\(/g)];
    if (before.length) worklets.add(before[before.length - 1][1]);
  }
}
const built = [...coreFiles].map(dist).join('\n');
const keptInDist = new Set([...built.matchAll(WORKLET_FN)].map(([, name]) => name));
let checked = 0;
for (const name of worklets) {
  if (!new RegExp(`function\\s+${name}\\s*\\(`).test(built)) continue;
  checked++;
  if (!keptInDist.has(name)) fail(`${name} lost its 'worklet' directive in the build`);
}
if (checked === 0) fail("found no worklet functions in the core's build");

if (!process.exitCode) {
  console.log(`check-dist: core and apple-health reach ${coreFiles.size} files, none with the DOM; ${checked} of ${worklets.size} worklets built, all kept`);
}
