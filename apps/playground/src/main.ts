import 'affect-kit/rater';
import 'affect-kit/result';
import 'affect-kit/face';
import './recipes/recipe-inertia';
import './recipes/recipe-resilience';
import './recipes/recipe-range';
import type { AffectKitFace }   from 'affect-kit/face';
import type { AffectKitResult } from 'affect-kit/result';
import type { AffectKitRater }  from 'affect-kit/rater';
import type { RecipeInertia }    from './recipes/recipe-inertia';
import type { RecipeResilience } from './recipes/recipe-resilience';
import type { RecipeRange }      from './recipes/recipe-range';
import { createRating, averageRatings } from 'affect-kit';

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

// ── Rater toggles ──────────────────────────────────────────────────────────
makeToggle('rater-color-toggle', (on) => {
  if (rater) rater.colorMode = on;
});
makeToggle('rater-animated-toggle', (on) => {
  if (rater) rater.animated = on;
});
makeToggle('rater-vad-toggle', (on) => {
  if (rater) rater.showVad = on;
});

// ── Result toggles ─────────────────────────────────────────────────────────
makeToggle('result-color-toggle', (on) => {
  if (resultEl) resultEl.colorMode = on;
});
makeToggle('result-face-toggle', (on) => {
  if (resultEl) resultEl.showFace = on;
});
makeToggle('result-animated-toggle', (on) => {
  if (resultEl) resultEl.animated = on;
});
makeToggle('result-vad-toggle', (on) => {
  if (resultEl) resultEl.showVad = on;
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

// ── Longitudinal widgets ───────────────────────────────────────────────────
// Word-cloud view: just an <affect-kit-result> fed an averaged synthetic Rating.
// Inertia / Resilience / Range: recipe components living in ./recipes/.
const summaryEl    = document.getElementById('insights-summary')    as AffectKitResult    | null;
const inertiaEl    = document.getElementById('insights-inertia')    as RecipeInertia    | null;
const resilienceEl = document.getElementById('insights-resilience') as RecipeResilience | null;
const rangeEl      = document.getElementById('insights-range')      as RecipeRange      | null;

// Seed demo time-series — a plausible 14-session arc with recovery
const now = Date.now();
const DAY = 86_400_000;
const demoRatings = [
  createRating({ v:  0.5, a:  0.3, labels: [{ name: 'content',  level: 2 }, { name: 'calm',  level: 1 }], timestamp: now - 13 * DAY }),
  createRating({ v:  0.3, a:  0.2, labels: [{ name: 'calm',     level: 2 }, { name: 'tired', level: 1 }], timestamp: now - 12 * DAY }),
  createRating({ v: -0.4, a:  0.4, labels: [{ name: 'anxious',  level: 2 }, { name: 'overwhelmed', level: 1 }], timestamp: now - 11 * DAY }),
  createRating({ v: -0.6, a:  0.5, labels: [{ name: 'anxious',  level: 3 }, { name: 'frustrated',  level: 2 }], timestamp: now - 10 * DAY }),
  createRating({ v: -0.5, a:  0.3, labels: [{ name: 'sad',      level: 2 }, { name: 'lonely',      level: 2 }], timestamp: now -  9 * DAY }),
  createRating({ v: -0.3, a:  0.2, labels: [{ name: 'sad',      level: 1 }, { name: 'tired',       level: 2 }], timestamp: now -  8 * DAY }),
  createRating({ v:  0.1, a: -0.1, labels: [{ name: 'calm',     level: 1 }], timestamp: now -  7 * DAY }),
  createRating({ v:  0.4, a:  0.2, labels: [{ name: 'hopeful',  level: 2 }, { name: 'content',     level: 1 }], timestamp: now -  6 * DAY }),
  createRating({ v:  0.6, a:  0.4, labels: [{ name: 'excited',  level: 2 }, { name: 'hopeful',     level: 2 }], timestamp: now -  5 * DAY }),
  createRating({ v:  0.7, a:  0.5, labels: [{ name: 'joy',      level: 3 }, { name: 'grateful',    level: 2 }], timestamp: now -  4 * DAY }),
  createRating({ v:  0.5, a:  0.2, labels: [{ name: 'content',  level: 2 }, { name: 'grateful',    level: 1 }], timestamp: now -  3 * DAY }),
  createRating({ v: -0.4, a:  0.3, labels: [{ name: 'anxious',  level: 2 }, { name: 'overwhelmed', level: 2 }], timestamp: now -  2 * DAY }),
  createRating({ v: -0.5, a:  0.4, labels: [{ name: 'anxious',  level: 2 }, { name: 'sad',         level: 1 }], timestamp: now -  1 * DAY }),
  createRating({ v: -0.4, a:  0.3, labels: [{ name: 'sad',      level: 2 }, { name: 'lonely',      level: 1 }], timestamp: now }),
];

function setInsightsRatings(ratings: typeof demoRatings) {
  if (summaryEl)    summaryEl.rating     = averageRatings(ratings);
  if (inertiaEl)    inertiaEl.ratings    = ratings;
  if (resilienceEl) resilienceEl.ratings = ratings;
  if (rangeEl)      rangeEl.ratings      = ratings;
}
setInsightsRatings(demoRatings);

// Live ratings also flow into insights when the rater emits
const liveRatings: typeof demoRatings = [];
rater?.addEventListener('change', (e) => {
  const rating = (e as CustomEvent).detail;
  if (resultEl) resultEl.rating = rating;
  liveRatings.push(rating);
  setInsightsRatings(liveRatings);
});
