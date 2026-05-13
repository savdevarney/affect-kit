import 'affect-kit/rater';
import 'affect-kit/result';
import 'affect-kit/face';
import 'affect-kit/compare';
import './example-tabs';
import type { AffectKitFace }    from 'affect-kit/face';
import type { AffectKitResult }  from 'affect-kit/result';
import type { AffectKitRater }   from 'affect-kit/rater';
import type { AffectKitCompare } from 'affect-kit/compare';
import { createRating, averageRatings } from 'affect-kit';
import type { ColorMode, Rating, Theme } from 'affect-kit';

// ── Element refs ───────────────────────────────────────────────────────────
const rater      = document.getElementById('rater')      as AffectKitRater  | null;
const resultEl   = document.getElementById('result')     as AffectKitResult | null;

// ── Seed result with a test rating on load ─────────────────────────────────
const seed: Rating = createRating({
  face: { v: 0.76, a: 0.48 },
  labels: [
    { name: 'joy',     level: 3 },
    { name: 'excited', level: 2 },
    { name: 'hopeful', level: 1 },
  ],
});
if (resultEl) resultEl.rating = seed;

// ── Rater → result wiring ──────────────────────────────────────────────────
rater?.addEventListener('change', (e) => {
  const rating = (e as CustomEvent<Rating>).detail;
  if (resultEl) resultEl.rating = rating;
});

// ── Toggle helper (boolean two-state switch) ──────────────────────────────
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

// ── Segmented control helper for `color-mode` (off / background / words) ──
function makeSeg(
  name: string,
  onChange: (value: ColorMode | null) => void,
) {
  const group = document.querySelector<HTMLElement>(`[data-seg="${name}"]`);
  if (!group) return;
  const btns = [...group.querySelectorAll<HTMLButtonElement>('.seg-btn')];
  btns.forEach(b => {
    b.addEventListener('click', () => {
      const value = b.dataset.val ?? 'off';
      group.dataset.value = value;
      btns.forEach(other => other.setAttribute('aria-pressed', String(other === b)));
      const mode: ColorMode | null =
        value === 'background' ? 'background'
        : value === 'words'    ? 'words'
        : null;
      onChange(mode);
    });
  });
}

// ── Segmented control helper for `theme` (light / dark / auto) ───────────
function makeThemeSeg(name: string, onChange: (value: Theme) => void) {
  const group = document.querySelector<HTMLElement>(`[data-seg="${name}"]`);
  if (!group) return;
  const btns = [...group.querySelectorAll<HTMLButtonElement>('.seg-btn')];
  btns.forEach(b => {
    b.addEventListener('click', () => {
      const value = (b.dataset.val ?? 'light') as Theme;
      group.dataset.value = value;
      btns.forEach(other => other.setAttribute('aria-pressed', String(other === b)));
      onChange(value);
    });
  });
}

// ── Code snippets that mirror toggle state ────────────────────────────────
const codeRater  = document.getElementById('code-rater');
const codeResult = document.getElementById('code-result');

const raterState  = {
  colorMode: null as ColorMode | null,
  animated: true,
  showVad: true,
  submitLabel: 'Done',
  theme: 'light' as Theme,
};
const resultState = {
  colorMode: 'background' as ColorMode | null,
  showFace: true,
  showLabels: true,
  animated: true,
  showVad: false,
  align: 'center' as 'left' | 'center' | 'right',
  variant: 'default' as 'default' | 'compact',
  theme: 'light' as Theme,
};

function colorAttr(mode: ColorMode | null): string | null {
  return mode === null ? null : `color-mode="${mode}"`;
}

function renderRaterCode() {
  if (!codeRater) return;
  const attrs: string[] = [];
  const c = colorAttr(raterState.colorMode);
  if (c) attrs.push(c);
  if (raterState.theme !== 'light') attrs.push(`theme="${raterState.theme}"`);
  if (!raterState.animated) attrs.push('animated="false"');
  if (raterState.showVad)   attrs.push('show-vad');
  if (raterState.submitLabel !== 'Done') attrs.push(`submit-label="${raterState.submitLabel}"`);
  const tag = attrs.length
    ? `<affect-kit-rater ${attrs.join(' ')}></affect-kit-rater>`
    : `<affect-kit-rater></affect-kit-rater>`;
  codeRater.textContent =
    `import 'affect-kit/rater';\n\n` +
    `// In your HTML:\n` +
    tag + `\n\n` +
    `// Listen for committed ratings:\n` +
    `const rater = document.querySelector('affect-kit-rater');\n` +
    `rater.addEventListener('commit', (e) => {\n` +
    `  const rating = e.detail;  // Rating\n` +
    `  // store, sync, or pipe into <affect-kit-result>\n` +
    `});`;
}

function renderResultCode() {
  if (!codeResult) return;
  const attrs: string[] = [];
  const c = colorAttr(resultState.colorMode);
  if (c) attrs.push(c);
  if (resultState.theme !== 'light')  attrs.push(`theme="${resultState.theme}"`);
  if (resultState.showFace)   attrs.push('show-face');
  if (resultState.showLabels) attrs.push('show-labels');
  if (!resultState.animated)  attrs.push('animated="false"');
  if (resultState.showVad)    attrs.push('show-vad');
  if (resultState.align   !== 'center')  attrs.push(`align="${resultState.align}"`);
  if (resultState.variant !== 'default') attrs.push(`variant="${resultState.variant}"`);
  const tag = attrs.length
    ? `<affect-kit-result ${attrs.join(' ')}></affect-kit-result>`
    : `<affect-kit-result></affect-kit-result>`;
  codeResult.textContent =
    `import 'affect-kit/result';\n\n` +
    `// In your HTML:\n` +
    tag + `\n\n` +
    `// Set a captured rating:\n` +
    `const result = document.querySelector('affect-kit-result');\n` +
    `result.rating = capturedRating;  // Rating from the rater's 'commit' event`;
}

renderRaterCode();
renderResultCode();

// ── Rater controls ─────────────────────────────────────────────────────────
makeSeg('rater-color', (mode) => {
  if (rater) rater.colorMode = mode;
  raterState.colorMode = mode; renderRaterCode();
});
makeThemeSeg('rater-theme', (theme) => {
  if (rater) rater.theme = theme;
  raterState.theme = theme; renderRaterCode();
});
makeToggle('rater-animated-toggle', (on) => {
  if (rater) rater.animated = on;
  raterState.animated = on; renderRaterCode();
});
makeToggle('rater-vad-toggle', (on) => {
  if (rater) rater.showVad = on;
  raterState.showVad = on; renderRaterCode();
});
const submitInput = document.getElementById('rater-submit-input') as HTMLInputElement | null;
submitInput?.addEventListener('input', () => {
  const v = submitInput.value || 'Done';
  if (rater) rater.submitLabel = v;
  raterState.submitLabel = v;
  renderRaterCode();
});

// ── Result controls ────────────────────────────────────────────────────────
makeSeg('result-color', (mode) => {
  if (resultEl) resultEl.colorMode = mode;
  resultState.colorMode = mode; renderResultCode();
});
makeThemeSeg('result-theme', (theme) => {
  if (resultEl) resultEl.theme = theme;
  resultState.theme = theme; renderResultCode();
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
const alignSelect   = document.getElementById('result-align-select')   as HTMLSelectElement | null;
const variantSelect = document.getElementById('result-variant-select') as HTMLSelectElement | null;
alignSelect?.addEventListener('change', () => {
  const v = alignSelect.value as 'left' | 'center' | 'right';
  if (resultEl) resultEl.align = v;
  resultState.align = v; renderResultCode();
});
variantSelect?.addEventListener('change', () => {
  const v = variantSelect.value as 'default' | 'compact';
  if (resultEl) resultEl.variant = v;
  resultState.variant = v; renderResultCode();
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
makeThemeSeg('face-theme', (theme) => { if (face) face.theme = theme; });

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
  createRating({ face: { v: -0.4, a:  0.5 }, labels: [
    { name: 'overwhelmed', level: 3 },
    { name: 'anxious',     level: 2 },
    { name: 'tired',       level: 1 },
  ]}),
  createRating({ face: { v: -0.5, a:  0.4 }, labels: [
    { name: 'frustrated',  level: 2 },
    { name: 'tired',       level: 2 },
  ]}),
  createRating({ face: { v: -0.3, a:  0.3 }, labels: [
    { name: 'overwhelmed', level: 2 },
    { name: 'sad',         level: 1 },
  ]}),
];

const today: Rating[] = [
  createRating({ face: { v:  0.5, a:  0.3 }, labels: [
    { name: 'calm',     level: 2 },
    { name: 'grateful', level: 1 },
  ]}),
  createRating({ face: { v:  0.7, a:  0.5 }, labels: [
    { name: 'joy',     level: 3 },
    { name: 'hopeful', level: 2 },
  ]}),
  createRating({ face: { v:  0.6, a:  0.2 }, labels: [
    { name: 'content',  level: 2 },
    { name: 'grateful', level: 2 },
    { name: 'calm',     level: 1 },
  ]}),
];

const compareEl = document.getElementById('demo-compare') as AffectKitCompare | null;
if (compareEl) {
  // Compare takes a single Rating per side; average the time series first.
  compareEl.beforeRating = averageRatings(yesterday);
  compareEl.afterRating  = averageRatings(today);
}

// Dynamic code snippet — mirrors the toggle state and shows the same data
// arrays the consumer would write themselves.
const codeCompare = document.getElementById('code-compare');
const compareState = {
  colorMode: 'background' as ColorMode | null,
  showFace: true,
  showLabels: true,
  beforeLabel: 'Yesterday',
  afterLabel: 'Today',
  theme: 'light' as Theme,
};

function fmtRatings(name: string, ratings: Rating[]): string {
  const lines: string[] = [`const ${name}: Rating[] = [`];
  for (const r of ratings) {
    const labelLines = r.labels
      .map(l => `    { name: '${l.name}', level: ${l.level} },`)
      .join('\n');
    lines.push(`  createRating({ face: { v: ${r.face.v.toFixed(2).padStart(5)}, a: ${r.face.a.toFixed(2).padStart(5)} }, labels: [`);
    lines.push(labelLines);
    lines.push(`  ]}),`);
  }
  lines.push(`];`);
  return lines.join('\n');
}

function renderCompareCode() {
  if (!codeCompare) return;
  const attrs: string[] = [
    `before-label="${compareState.beforeLabel}"`,
    `after-label="${compareState.afterLabel}"`,
  ];
  const c = colorAttr(compareState.colorMode);
  if (c) attrs.push(c);
  if (compareState.theme !== 'light') attrs.push(`theme="${compareState.theme}"`);
  if (compareState.showFace)  attrs.push('show-face');
  if (compareState.showLabels) attrs.push('show-labels');
  const html =
    `<affect-kit-compare\n  ` +
    attrs.join('\n  ') +
    `\n></affect-kit-compare>`;

  codeCompare.textContent =
    `import 'affect-kit/compare';\n` +
    `import { createRating, averageRatings } from 'affect-kit';\n` +
    `\n` +
    fmtRatings('yesterday', yesterday) + `\n\n` +
    fmtRatings('today', today) + `\n\n` +
    `// In your HTML:\n` +
    html + `\n\n` +
    `// Compare takes one Rating per side — average time series upstream:\n` +
    `const cmp = document.querySelector('affect-kit-compare');\n` +
    `cmp.beforeRating = averageRatings(yesterday);\n` +
    `cmp.afterRating  = averageRatings(today);`;
}

renderCompareCode();

makeSeg('compare-color', (mode) => {
  if (compareEl) compareEl.colorMode = mode;
  compareState.colorMode = mode; renderCompareCode();
});
makeThemeSeg('compare-theme', (theme) => {
  if (compareEl) compareEl.theme = theme;
  compareState.theme = theme; renderCompareCode();
});
makeToggle('compare-face-toggle', (on) => {
  if (compareEl) compareEl.showFace = on;
  compareState.showFace = on; renderCompareCode();
});
makeToggle('compare-labels-toggle', (on) => {
  if (compareEl) compareEl.showLabels = on;
  compareState.showLabels = on; renderCompareCode();
});
const beforeInput = document.getElementById('compare-before-input') as HTMLInputElement | null;
const afterInput  = document.getElementById('compare-after-input')  as HTMLInputElement | null;
beforeInput?.addEventListener('input', () => {
  const v = beforeInput.value;
  if (compareEl) compareEl.beforeLabel = v;
  compareState.beforeLabel = v; renderCompareCode();
});
afterInput?.addEventListener('input', () => {
  const v = afterInput.value;
  if (compareEl) compareEl.afterLabel = v;
  compareState.afterLabel = v; renderCompareCode();
});
