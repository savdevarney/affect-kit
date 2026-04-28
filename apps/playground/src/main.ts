import 'affect-kit/rater';
import 'affect-kit/result';
import 'affect-kit/face';
import './example-tabs';
import './recipes/recipe-sparkline';
import './recipes/recipe-scatter';
import './recipes/recipe-cumulative';
import type { AffectKitFace }   from 'affect-kit/face';
import type { AffectKitResult } from 'affect-kit/result';
import type { AffectKitRater }  from 'affect-kit/rater';
import type { RecipeSparkline }  from './recipes/recipe-sparkline';
import type { RecipeScatter }    from './recipes/recipe-scatter';
import type { RecipeCumulative } from './recipes/recipe-cumulative';
import { createRating, averageRatings } from 'affect-kit';
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

// ── Longitudinal demo: three series, same widgets ─────────────────────────
// Pure data shape — we name what's *visible in the data*, not what it "means."
// All interpretation is left to the consumer / clinician / researcher.

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

// Series 1 — narrow V (V hovers in 0.3..0.7, A near 0)
const series1 = makeSeries({
  count: 20,
  vAt: (i) => 0.5 + 0.18 * Math.sin(i * 0.7),
  aAt: (i) => 0.05 + 0.2 * Math.cos(i * 0.5),
  labelsAt: (i) => {
    const cycle: Lbl[][] = [
      [{ name: 'content',   level: 2 }, { name: 'calm',     level: 1 }],
      [{ name: 'peaceful',  level: 2 }],
      [{ name: 'satisfied', level: 2 }, { name: 'grateful', level: 1 }],
      [{ name: 'calm',      level: 2 }],
      [{ name: 'hopeful',   level: 1 }, { name: 'content',  level: 2 }],
      [{ name: 'serene',    level: 2 }],
    ];
    return cycle[i % cycle.length]!;
  },
});

// Series 2 — drifting V (slow downward drift +0.5 → −0.5, A relatively stable)
const series2 = makeSeries({
  count: 20,
  vAt: (i, n) => 0.5 - (i / (n - 1)) * 1.0,
  aAt: (i) => 0.15 + 0.15 * Math.sin(i * 0.6),
  labelsAt: (i, n) => {
    // Labels shift from positive → mixed → negative as V drifts.
    const phase = i / (n - 1); // 0..1
    if (phase < 0.33) return [{ name: 'content', level: 2 }, { name: 'hopeful', level: 1 }];
    if (phase < 0.55) return [{ name: 'calm',    level: 1 }, { name: 'tired',   level: 1 }];
    if (phase < 0.75) return [{ name: 'tired',   level: 2 }, { name: 'sad',     level: 1 }];
    return                  [{ name: 'sad',     level: 2 }, { name: 'lonely',  level: 1 }];
  },
});

// Series 3 — wide range (V from −0.7..+0.7, A from −0.5..+0.7)
const series3 = makeSeries({
  count: 20,
  vAt: (i) => 0.7 * Math.sin(i * 0.55) - 0.05 * Math.cos(i * 0.31),
  aAt: (i) => 0.4 * Math.cos(i * 0.4) + 0.25 * Math.sin(i * 0.7),
  labelsAt: (i) => {
    const cycle: Lbl[][] = [
      [{ name: 'joy',         level: 3 }, { name: 'excited',     level: 2 }],
      [{ name: 'frustrated',  level: 2 }, { name: 'overwhelmed', level: 1 }],
      [{ name: 'curious',     level: 2 }],
      [{ name: 'sad',         level: 2 }, { name: 'lonely',      level: 1 }],
      [{ name: 'grateful',    level: 2 }, { name: 'content',     level: 1 }],
      [{ name: 'anxious',     level: 2 }],
      [{ name: 'calm',        level: 1 }, { name: 'peaceful',    level: 1 }],
      [{ name: 'hopeful',     level: 2 }, { name: 'determined',  level: 1 }],
    ];
    return cycle[i % cycle.length]!;
  },
});

// One widget stack, switchable. Click an Example button → load that series.
const examples: Array<{ name: string; shape: string; ratings: Rating[] }> = [
  { name: 'Example 1', shape: 'a steady series',   ratings: series1 },
  { name: 'Example 2', shape: 'a drifting series', ratings: series2 },
  { name: 'Example 3', shape: 'a varied series',   ratings: series3 },
];

const summaryEl    = document.getElementById('series-summary')    as AffectKitResult   | null;
const sparklineEl  = document.getElementById('series-sparkline')  as RecipeSparkline   | null;
const scatterEl    = document.getElementById('series-scatter')    as RecipeScatter     | null;
const cumulativeEl = document.getElementById('series-cumulative') as RecipeCumulative  | null;
const statsEl      = document.getElementById('series-stats');
const captionEl    = document.getElementById('series-caption');

function loadExample(idx: number): void {
  const ex = examples[idx];
  if (!ex) return;
  if (summaryEl)    summaryEl.rating       = averageRatings(ex.ratings);
  if (sparklineEl)  sparklineEl.ratings    = ex.ratings;
  if (scatterEl)    scatterEl.ratings      = ex.ratings;
  if (cumulativeEl) cumulativeEl.ratings   = ex.ratings;

  if (captionEl) {
    captionEl.innerHTML = `<strong>${ex.name}</strong> — ${ex.shape}.`;
  }

  if (statsEl) {
    const vs = ex.ratings.map(r => r.v);
    const as = ex.ratings.map(r => r.a);
    const labelNames = new Set<string>();
    for (const r of ex.ratings) for (const l of r.labels) labelNames.add(l.name);
    const fmt = (x: number) => x.toFixed(2).replace('-', '−');
    const spanDays = Math.round((ex.ratings[ex.ratings.length - 1]!.timestamp - ex.ratings[0]!.timestamp) / DAY);
    statsEl.innerHTML = `
      <span>${ex.ratings.length} sessions over ${spanDays} days</span>
      <span>V: ${fmt(Math.min(...vs))} to ${fmt(Math.max(...vs))}</span>
      <span>A: ${fmt(Math.min(...as))} to ${fmt(Math.max(...as))}</span>
      <span>${labelNames.size} unique labels</span>
    `;
  }

  // Update segmented-control selected state
  for (let i = 0; i < examples.length; i++) {
    const btn = document.getElementById(`series-btn-${i + 1}`);
    if (btn) btn.setAttribute('aria-selected', String(i === idx));
  }
}

for (let i = 0; i < examples.length; i++) {
  document.getElementById(`series-btn-${i + 1}`)?.addEventListener('click', () => loadExample(i));
}

loadExample(0);
