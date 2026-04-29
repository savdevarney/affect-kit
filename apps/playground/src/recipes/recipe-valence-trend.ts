// Recipe: <recipe-valence-trend> — V over time, with stuck stretches shaded.
//
// MVP scope: just the inertia overlay. A "stuck" stretch is ≥ 3 consecutive
// sessions where V < -0.2; those sessions get amber shading under the curve
// and a small "N sessions" label. Resilience markers and a label-diversity
// caption can layer on top of this in follow-up commits.
//
// The widget makes no clinical claim about what "stuck" means for any
// individual — it just surfaces a pattern that emotion-dynamics research
// (Kuppens et al. 2010) treats as the canonical inertia signal.
//
// Sessions, not days. Rating.timestamp is used only to sort the series.
// 5 ratings in one afternoon counts as 5 sessions; the widget makes no
// calendar-time claims.
//
// Example code, not part of the affect-kit package surface.

import { LitElement, html, css, svg, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Rating } from 'affect-kit';

/** Sustained-V threshold below which a session counts as "difficult". */
const STUCK_V = -0.2;
/** Consecutive difficult sessions before a stretch is marked. */
const MIN_STUCK_STREAK = 3;

interface StuckStretch {
  startIndex: number;
  endIndex: number;   // inclusive
  length: number;
}

@customElement('recipe-valence-trend')
export class RecipeValenceTrend extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-size: 1rem;
    }
    .panel {
      background: white;
      border-radius: 1.25em;
      padding: 1.25em 1.5em;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04);
    }
    .label {
      font-size: 0.62em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #bbb;
      margin: 0 0 0.7em;
    }
    svg {
      width: 100%;
      height: 140px;
      display: block;
      overflow: visible;
    }
    .axis        { stroke: #e5e5e5; stroke-width: 0.6; }
    .axis-zero   { stroke: #bbb;    stroke-width: 0.7; }
    .axis-tick   {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 7px;
      fill: #aaa;
    }
    .v-line      { fill: none; stroke: #1a1a1a; stroke-width: 1.4; stroke-linejoin: round; stroke-linecap: round; }
    .v-dot       { fill: #1a1a1a; }
    .stuck-fill  { fill: rgba(201,122,42,0.18); stroke: none; }
    .stuck-label {
      font-family: system-ui, sans-serif;
      font-size: 6.5px;
      font-weight: 600;
      fill: #c97a2a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .empty { color: #bbb; font-size: 0.78em; line-height: 1.6; }
  `;

  @property({ attribute: false }) ratings: Rating[] = [];

  override render() {
    const sorted = [...this.ratings].sort((a, b) => a.timestamp - b.timestamp);
    return html`
      <div class="panel">
        <p class="label">Valence over time</p>
        ${sorted.length < 2
          ? html`<p class="empty">Need at least 2 sessions to plot a trend.</p>`
          : this._chart(sorted)}
      </div>
    `;
  }

  private _chart(ratings: Rating[]) {
    const W = 300;
    const H = 100;
    const PAD_X = 14;
    const PAD_Y = 8;
    const n = ratings.length;

    // X scale: linear over session index. Honest but simple.
    const xOf = (i: number) => PAD_X + (i / (n - 1)) * (W - PAD_X * 2);
    // V in [-1, 1] → y in [H-PAD_Y, PAD_Y].
    const yOf = (v: number) => PAD_Y + ((1 - v) / 2) * (H - PAD_Y * 2);

    const zeroY = yOf(0);
    const stuckYTop = yOf(STUCK_V);
    const bottomY = H - PAD_Y;

    // Detect stuck stretches: ≥3 consecutive sessions with V < STUCK_V.
    const stretches = detectStuck(ratings);

    // Polyline for the V trace.
    const linePts = ratings
      .map((r, i) => `${xOf(i).toFixed(1)},${yOf(r.v).toFixed(1)}`)
      .join(' ');

    // Shaded fills under the curve for each stuck stretch.
    const stuckFills = stretches.map(s => {
      // Build a polygon: from (xStart, stuckYTop) along the V-trace points
      // back down to (xEnd, stuckYTop). We use stuckYTop as the cap, not
      // the zero line, so the fill lives "below the threshold" rather
      // than "below zero".
      const pts: string[] = [];
      pts.push(`${xOf(s.startIndex).toFixed(1)},${stuckYTop.toFixed(1)}`);
      for (let i = s.startIndex; i <= s.endIndex; i++) {
        pts.push(`${xOf(i).toFixed(1)},${yOf(ratings[i]!.v).toFixed(1)}`);
      }
      pts.push(`${xOf(s.endIndex).toFixed(1)},${stuckYTop.toFixed(1)}`);
      return svg`<polygon class="stuck-fill" points="${pts.join(' ')}" />`;
    });

    // Per-stretch label below the plot.
    const stuckLabels = stretches.map(s => {
      const cx = (xOf(s.startIndex) + xOf(s.endIndex)) / 2;
      return svg`
        <text class="stuck-label" x="${cx.toFixed(1)}" y="${(bottomY + 7).toFixed(1)}" text-anchor="middle">
          ${s.length} sessions
        </text>
      `;
    });

    // Dots at each rating point.
    const dots = ratings.map((r, i) => svg`
      <circle class="v-dot"
        cx="${xOf(i).toFixed(1)}"
        cy="${yOf(r.v).toFixed(1)}"
        r="1.8"
      />
    `);

    return svg`
      <svg viewBox="0 0 ${W} ${H + 12}" preserveAspectRatio="xMidYMid meet">
        <!-- Y-axis ticks -->
        <line class="axis" x1="${PAD_X}" y1="${PAD_Y}" x2="${W - PAD_X}" y2="${PAD_Y}" />
        <line class="axis-zero" x1="${PAD_X}" y1="${zeroY.toFixed(1)}" x2="${W - PAD_X}" y2="${zeroY.toFixed(1)}" />
        <line class="axis" x1="${PAD_X}" y1="${bottomY}" x2="${W - PAD_X}" y2="${bottomY}" />
        <text class="axis-tick" x="${PAD_X - 3}" y="${PAD_Y + 2}" text-anchor="end">+1</text>
        <text class="axis-tick" x="${PAD_X - 3}" y="${zeroY + 2}" text-anchor="end">0</text>
        <text class="axis-tick" x="${PAD_X - 3}" y="${bottomY + 2}" text-anchor="end">−1</text>

        ${stuckFills}
        <polyline class="v-line" points="${linePts}" />
        ${dots}
        ${stuckLabels.length ? stuckLabels : nothing}
      </svg>
    `;
  }
}

function detectStuck(ratings: Rating[]): StuckStretch[] {
  const out: StuckStretch[] = [];
  let i = 0;
  while (i < ratings.length) {
    if (ratings[i]!.v >= STUCK_V) { i++; continue; }
    const start = i;
    while (i < ratings.length && ratings[i]!.v < STUCK_V) i++;
    const end = i - 1;
    const length = end - start + 1;
    if (length >= MIN_STUCK_STREAK) {
      out.push({ startIndex: start, endIndex: end, length });
    }
  }
  return out;
}

declare global {
  interface HTMLElementTagNameMap {
    'recipe-valence-trend': RecipeValenceTrend;
  }
}
