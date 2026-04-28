// Recipe: <recipe-sparkline> — V and A trajectories as two thin lines over
// session index. Neutral plot — no zones, no shading, no thresholds. The
// viewer interprets the shape; the widget makes no claims.
//
// Example code, not part of the affect-kit package surface.

import { LitElement, html, css, svg, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Rating } from 'affect-kit';

@customElement('recipe-sparkline')
export class RecipeSparkline extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-size: 1rem;
    }
    .panel {
      background: white;
      border-radius: 1.25em;
      padding: 1.1em 1.25em;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04);
    }
    .label {
      font-size: 0.62em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #bbb;
      margin: 0 0 0.4em;
    }
    .legend {
      display: flex;
      gap: 0.9em;
      font-size: 0.68em;
      color: #888;
      margin: 0.5em 0 0;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
    }
    .legend .swatch {
      display: inline-block;
      width: 14px;
      height: 2px;
      vertical-align: middle;
      margin-right: 4px;
    }
    .legend .v { background: #1a1a1a; }
    .legend .a { background: #999; }
    svg { width: 100%; height: 56px; display: block; }
    .axis  { stroke: #e5e5e5; stroke-width: 1; stroke-dasharray: 3 3; }
    .v-line { fill: none; stroke: #1a1a1a; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
    .a-line { fill: none; stroke: #999;   stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; }
    .empty { color: #bbb; font-size: 0.78em; }
  `;

  @property({ attribute: false }) ratings: Rating[] = [];

  override render() {
    const sorted = [...this.ratings].sort((a, b) => a.timestamp - b.timestamp);
    return html`
      <div class="panel">
        <p class="label">V / A over sessions</p>
        ${sorted.length < 2 ? html`<p class="empty">Need at least 2 sessions.</p>` : this._chart(sorted)}
        <div class="legend">
          <span><span class="swatch v"></span>V</span>
          <span><span class="swatch a"></span>A</span>
        </div>
      </div>
    `;
  }

  private _chart(ratings: Rating[]) {
    const W = 100, H = 40, PAD = 3;
    const n = ratings.length;
    const xOf = (i: number) => PAD + (i / (n - 1)) * (W - PAD * 2);
    // V/A in [-1, 1] → y in [H-PAD, PAD]
    const yOf = (val: number) => PAD + ((1 - val) / 2) * (H - PAD * 2);
    const zeroY = yOf(0);

    const vPts = ratings.map((r, i) => `${xOf(i).toFixed(1)},${yOf(r.v).toFixed(1)}`).join(' ');
    const aPts = ratings.map((r, i) => `${xOf(i).toFixed(1)},${yOf(r.a).toFixed(1)}`).join(' ');

    return svg`
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <line class="axis" x1="${PAD}" y1="${zeroY.toFixed(1)}" x2="${W - PAD}" y2="${zeroY.toFixed(1)}" />
        <polyline class="a-line" points="${aPts}" />
        <polyline class="v-line" points="${vPts}" />
      </svg>
      ${nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'recipe-sparkline': RecipeSparkline;
  }
}
