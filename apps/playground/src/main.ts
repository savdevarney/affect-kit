import 'affect-kit/rater';
import 'affect-kit/result';
import 'affect-kit/face';
import 'affect-kit/compare';
import './example-tabs';
import type { AffectKitFace }    from 'affect-kit/face';
import type { AffectKitResult }  from 'affect-kit/result';
import type { AffectKitRater }   from 'affect-kit/rater';
import type { AffectKitCompare } from 'affect-kit/compare';
import { createRating } from 'affect-kit';
import type { Rating } from 'affect-kit';

// ── Element refs ───────────────────────────────────────────────────────────
const rater      = document.getElementById('rater')      as AffectKitRater  | null;
const resultEl   = document.getElementById('result')     as AffectKitResult | null;

// ── Seed result with a test rating on load ─────────────────────────────────
const testRating = {
  v: 0.76, a: 0.48, d: 0.35,
  pad: { v: 0.76, a: 0.48 },
  fromLabels: true,
  labels: [
    { name: 'joy',     level: 3 as const },
    { name: 'excited', level: 2 as const },
    { name: 'hopeful', level: 1 as const },
  ],
  timestamp: Date.now(),
};
if (resultEl) resultEl.rating = testRating;

// ── Rater → result wiring ──────────────────────────────────────────────────
rater?.addEventListener('change', (e) => {
  const rating = (e as CustomEvent).detail;
  if (resultEl) resultEl.rating = rating;
});

// ── Toggle helper ──────────────────────────────────────────────────────────
function makeToggle(
  id: string,
  onChange: (on: boolean) => void,
) {
  const btn = document.getElementById(id) as HTMLButtonElement | null;
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(next));
    const thumb = btn.querySelector<HTMLElement>('.toggle-thumb');
    if (thumb) thumb.style.transform = next ? 'translateX(14px)' : '';
    onChange(next);
  });
}

// ── Code snippets that mirror toggle state ────────────────────────────────
const codeRater  = document.getElementById('code-rater');
const codeResult = document.getElementById('code-result');

const raterState  = { colorMode: false, animated: true,  showVad: true };
const resultState = { colorMode: true,  showFace: true,  showLabels: true, animated: true, showVad: false };

function renderRaterCode() {
  if (!codeRater) return;
  const attrs: string[] = [];
  if (raterState.colorMode) attrs.push('color-mode');
  if (!raterState.animated) attrs.push('animated="false"');
  if (raterState.showVad)   attrs.push('show-vad');
  const tag = attrs.length
    ? `<affect-kit-rater ${attrs.join(' ')}></affect-kit-rater>`
    : `<affect-kit-rater></affect-kit-rater>`;
  codeRater.textContent =
    `import 'affect-kit/rater';\n\n` +
    `// In your HTML:\n` +
    tag + `\n\n` +
    `// Listen for committed ratings:\n` +
    `const rater = document.querySelector('affect-kit-rater');\n` +
    `rater.addEventListener('change', (e) => {\n` +
    `  const rating = e.detail;  // Rating\n` +
    `  // store, sync, or pipe into <affect-kit-result>\n` +
    `});`;
}

function renderResultCode() {
  if (!codeResult) return;
  const attrs: string[] = [];
  if (resultState.colorMode)  attrs.push('color-mode');
  if (resultState.showFace)   attrs.push('show-face');
  if (resultState.showLabels) attrs.push('show-labels');
  if (!resultState.animated)  attrs.push('animated="false"');
  if (resultState.showVad)    attrs.push('show-vad');
  const tag = attrs.length
    ? `<affect-kit-result ${attrs.join(' ')}></affect-kit-result>`
    : `<affect-kit-result></affect-kit-result>`;
  codeResult.textContent =
    `import 'affect-kit/result';\n\n` +
    `// In your HTML:\n` +
    tag + `\n\n` +
    `// Set a captured rating:\n` +
    `const result = document.querySelector('affect-kit-result');\n` +
    `result.rating = capturedRating;  // Rating from the rater's 'change' event`;
}

renderRaterCode();
renderResultCode();

// ── Rater toggles ──────────────────────────────────────────────────────────
makeToggle('rater-color-toggle', (on) => {
  if (rater) rater.colorMode = on;
  raterState.colorMode = on; renderRaterCode();
});
makeToggle('rater-animated-toggle', (on) => {
  if (rater) rater.animated = on;
  raterState.animated = on; renderRaterCode();
});
makeToggle('rater-vad-toggle', (on) => {
  if (rater) rater.showVad = on;
  raterState.showVad = on; renderRaterCode();
});

// ── Result toggles ─────────────────────────────────────────────────────────
makeToggle('result-color-toggle', (on) => {
  if (resultEl) resultEl.colorMode = on;
  resultState.colorMode = on; renderResultCode();
});
makeToggle('result-face-toggle', (on) => {
  if (resultEl) resultEl.showFace = on;
  resultState.showFace = on; renderResultCode();
});
makeToggle('result-labels-toggle', (on) => {
  if (resultEl) resultEl.showLabels = on;
  resultState.showLabels = on; renderResultCode();
});
makeToggle('result-animated-toggle', (on) => {
  if (resultEl) resultEl.animated = on;
  resultState.animated = on; renderResultCode();
});
makeToggle('result-vad-toggle', (on) => {
  if (resultEl) resultEl.showVad = on;
  resultState.showVad = on; renderResultCode();
});

// ── Interactive face sliders ───────────────────────────────────────────────
const face    = document.getElementById('interactive-face') as AffectKitFace | null;
const vSlider = document.getElementById('v-slider') as HTMLInputElement | null;
const aSlider = document.getElementById('a-slider') as HTMLInputElement | null;
const vVal    = document.getElementById('v-val');
const aVal    = document.getElementById('a-val');

function updateFace() {
  if (!face || !vSlider || !aSlider) return;
  const v = parseFloat(vSlider.value);
  const a = parseFloat(aSlider.value);
  face.v = v;
  face.a = a;
  if (vVal) vVal.textContent = v.toFixed(2);
  if (aVal) aVal.textContent = a.toFixed(2);
}

vSlider?.addEventListener('input', updateFace);
aSlider?.addEventListener('input', updateFace);
document.getElementById('shock-btn')?.addEventListener('click', () => face?.triggerShock());

// ── Reset ──────────────────────────────────────────────────────────────────
document.getElementById('reset-btn')?.addEventListener('click', () => {
  rater?.reset();
  if (resultEl) resultEl.rating = null;
});

// ── <affect-kit-compare> demo ──────────────────────────────────────────────
// "Yesterday" (overwhelmed) → "Today" (better) — three sessions per day.
// The data is hand-authored so the playground's Code tab can show the
// exact arrays the consumer would write themselves.
const yesterday: Rating[] = [
  createRating({ v: -0.4, a:  0.5, labels: [
    { name: 'overwhelmed', level: 3 },
    { name: 'anxious',     level: 2 },
    { name: 'tired',       level: 1 },
  ]}),
  createRating({ v: -0.5, a:  0.4, labels: [
    { name: 'frustrated',  level: 2 },
    { name: 'tired',       level: 2 },
  ]}),
  createRating({ v: -0.3, a:  0.3, labels: [
    { name: 'overwhelmed', level: 2 },
    { name: 'sad',         level: 1 },
  ]}),
];

const today: Rating[] = [
  createRating({ v:  0.5, a:  0.3, labels: [
    { name: 'calm',     level: 2 },
    { name: 'grateful', level: 1 },
  ]}),
  createRating({ v:  0.7, a:  0.5, labels: [
    { name: 'joy',     level: 3 },
    { name: 'hopeful', level: 2 },
  ]}),
  createRating({ v:  0.6, a:  0.2, labels: [
    { name: 'content',  level: 2 },
    { name: 'grateful', level: 2 },
    { name: 'calm',     level: 1 },
  ]}),
];

const compareEl = document.getElementById('demo-compare') as AffectKitCompare | null;
if (compareEl) {
  compareEl.beforeRating = yesterday;
  compareEl.afterRating  = today;
}

// Dynamic code snippet — mirrors the toggle state and shows the same data
// arrays the consumer would write themselves.
const codeCompare = document.getElementById('code-compare');
const compareState = { colorMode: true, showFace: true, showLabels: true };

function fmtRatings(name: string, ratings: Rating[]): string {
  const lines: string[] = [`const ${name}: Rating[] = [`];
  for (const r of ratings) {
    const labelLines = r.labels
      .map(l => `    { name: '${l.name}', level: ${l.level} },`)
      .join('\n');
    lines.push(`  createRating({ v: ${r.pad.v.toFixed(2).padStart(5)}, a: ${r.pad.a.toFixed(2).padStart(5)}, labels: [`);
    lines.push(labelLines);
    lines.push(`  ]}),`);
  }
  lines.push(`];`);
  return lines.join('\n');
}

function renderCompareCode() {
  if (!codeCompare) return;
  const attrs: string[] = ['before-label="Yesterday"', 'after-label="Today"'];
  if (compareState.colorMode) attrs.push('color-mode');
  if (compareState.showFace)  attrs.push('show-face');
  if (compareState.showLabels) attrs.push('show-labels');
  const html =
    `<affect-kit-compare\n  ` +
    attrs.join('\n  ') +
    `\n></affect-kit-compare>`;

  codeCompare.textContent =
    `import 'affect-kit/compare';\n` +
    `import { createRating } from 'affect-kit';\n` +
    `\n` +
    fmtRatings('yesterday', yesterday) + `\n\n` +
    fmtRatings('today', today) + `\n\n` +
    `// In your HTML:\n` +
    html + `\n\n` +
    `// Wire it up:\n` +
    `const cmp = document.querySelector('affect-kit-compare');\n` +
    `cmp.beforeRating = yesterday;\n` +
    `cmp.afterRating  = today;`;
}

renderCompareCode();

makeToggle('compare-color-toggle', (on) => {
  if (compareEl) compareEl.colorMode = on;
  compareState.colorMode = on; renderCompareCode();
});
makeToggle('compare-face-toggle', (on) => {
  if (compareEl) compareEl.showFace = on;
  compareState.showFace = on; renderCompareCode();
});
makeToggle('compare-labels-toggle', (on) => {
  if (compareEl) compareEl.showLabels = on;
  compareState.showLabels = on; renderCompareCode();
});

