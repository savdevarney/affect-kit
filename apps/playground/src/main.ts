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
const result = document.getElementById('result');
const log = document.getElementById('event-log');

rater?.addEventListener('change', (e) => {
  const rating = (e as CustomEvent).detail;
  if (result) (result as any).rating = rating;
  if (log) {
    const entry = document.createElement('p');
    entry.textContent = JSON.stringify(rating, null, 0);
    const empty = log.querySelector('.empty-log');
    if (empty) empty.remove();
    log.prepend(entry);
  }
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
