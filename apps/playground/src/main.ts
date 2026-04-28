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
import type { Rating, EmotionName } from 'affect-kit';

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
const resultState = { colorMode: true,  showFace: true,  animated: true, showVad: false };

function renderRaterCode() {
  if (!codeRater) return;
  const attrs: string[] = [];
  if (raterState.colorMode) attrs.push('color-mode');
  if (!raterState.animated) attrs.push('animated="false"');
  if (raterState.showVad)   attrs.push('show-vad');
  const tag = attrs.length ? `<affect-kit-rater ${attrs.join(' ')}>` : '<affect-kit-rater>';
  codeRater.textContent = `${tag}</affect-kit-rater>`;
}

function renderResultCode() {
  if (!codeResult) return;
  const attrs: string[] = [];
  if (resultState.colorMode) attrs.push('color-mode');
  if (resultState.showFace)  attrs.push('show-face');
  attrs.push('show-labels');
  if (!resultState.animated) attrs.push('animated="false"');
  if (resultState.showVad)   attrs.push('show-vad');
  codeResult.textContent =
    `<affect-kit-result ${attrs.join(' ')}></affect-kit-result>\n\n` +
    `<script type="module">\n` +
    `  import 'affect-kit/result';\n` +
    `  document.querySelector('affect-kit-result').rating = capturedRating;\n` +
    `</script>`;
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
// A 14-session series with a clear positive → negative drift, split into
// first half vs last half. Visualises the drift purely through the
// existing words+face+color language; no metric, no claim.
const DAY = 86_400_000;
const now = Date.now();

type Lbl = { name: EmotionName; level: 1 | 2 | 3 };

function makeSeries(opts: {
  count: number;
  vAt: (i: number, n: number) => number;
  aAt: (i: number, n: number) => number;
  labelsAt: (i: number, n: number) => Lbl[];
}): Rating[] {
  const { count, vAt, aAt, labelsAt } = opts;
  return Array.from({ length: count }, (_, i) => createRating({
    v: vAt(i, count),
    a: aAt(i, count),
    labels: labelsAt(i, count),
    timestamp: now - (count - 1 - i) * DAY,
  }));
}

const driftingSeries = makeSeries({
  count: 14,
  vAt: (i, n) => 0.5 - (i / (n - 1)) * 1.0,
  aAt: (i) => 0.15 + 0.15 * Math.sin(i * 0.6),
  labelsAt: (i, n) => {
    const phase = i / (n - 1);
    if (phase < 0.33) return [{ name: 'content', level: 2 }, { name: 'hopeful', level: 1 }];
    if (phase < 0.55) return [{ name: 'calm',    level: 1 }, { name: 'tired',   level: 1 }];
    if (phase < 0.75) return [{ name: 'tired',   level: 2 }, { name: 'sad',     level: 1 }];
    return                  [{ name: 'sad',     level: 2 }, { name: 'lonely',  level: 1 }];
  },
});

const compareEl = document.getElementById('demo-compare') as AffectKitCompare | null;
if (compareEl) {
  const half = Math.floor(driftingSeries.length / 2);
  compareEl.beforeRating = driftingSeries.slice(0, half);
  compareEl.afterRating  = driftingSeries.slice(half);
}
