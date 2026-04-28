import 'affect-kit/rater';
import 'affect-kit/result';
import 'affect-kit/face';
import type { AffectKitFace } from 'affect-kit/face';
import type { AffectKitResult } from 'affect-kit/result';

// ── Seed result panel with a test rating ──────────────────────────────────
const resultEl = document.getElementById('result') as AffectKitResult | null;
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

const resultPlain = document.getElementById('result-plain') as AffectKitResult | null;
if (resultPlain) resultPlain.rating = testRating;

// ── Rater → result wiring ──────────────────────────────────────────────────
const rater = document.getElementById('rater');
document.getElementById('rater')?.addEventListener('change', (e) => {
  const rating = (e as CustomEvent).detail;
  if (resultEl) resultEl.rating = rating;
  if (resultPlain) resultPlain.rating = rating;
});

document.getElementById('rater-color')?.addEventListener('change', (e) => {
  const rating = (e as CustomEvent).detail;
  console.log('rater-color change:', JSON.stringify(rating));
});

// ── Interactive face controls ──────────────────────────────────────────────
const face = document.getElementById('interactive-face') as AffectKitFace | null;
const vSlider = document.getElementById('v-slider') as HTMLInputElement | null;
const aSlider = document.getElementById('a-slider') as HTMLInputElement | null;
const vVal = document.getElementById('v-val');
const aVal = document.getElementById('a-val');
const shockBtn = document.getElementById('shock-btn');

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

shockBtn?.addEventListener('click', () => {
  face?.triggerShock();
});
