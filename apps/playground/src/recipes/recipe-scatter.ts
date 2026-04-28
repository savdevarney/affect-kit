// Recipe: <recipe-scatter> — VA phase portrait.
//
// Three layers stacked:
//   1. faint convex hull (the polygon enclosing all sessions)
//   2. consecutive-session connecting lines, age-faded (oldest faintest)
//   3. dots, age-faded (oldest faintest)
//
// Faint cross-axis at origin, no quadrant fills, no quadrant labels. The
// viewer reads the trajectory; the widget makes no claims about regions.
//
// Example code, not part of the affect-kit package surface.

import { LitElement, html, css, svg, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Rating } from 'affect-kit';

interface Pt { x: number; y: number }

@customElement('recipe-scatter')
export class RecipeScatter extends LitElement {
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
    .axis-tick {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 0.62em;
      fill: #bbb;
    }
    svg {
      width: 100%;
      max-width: 320px;
      height: auto;
      display: block;
      margin: 0.4em auto;
    }
    .axis  { stroke: #e5e5e5; stroke-width: 0.4; }
    .hull  { fill: rgba(26,26,26,0.04); stroke: rgba(26,26,26,0.18); stroke-width: 0.3; }
    .seg   { stroke: #1a1a1a; stroke-width: 0.5; fill: none; stroke-linecap: round; }
    .dot   { fill: #1a1a1a; }
    .empty { color: #bbb; font-size: 0.78em; }
  `;

  @property({ attribute: false }) ratings: Rating[] = [];

  override render() {
    const sorted = [...this.ratings].sort((a, b) => a.timestamp - b.timestamp);
    return html`
      <div class="panel">
        <p class="label">V × A phase portrait (older → newer)</p>
        ${sorted.length === 0
          ? html`<p class="empty">No sessions.</p>`
          : this._chart(sorted)}
      </div>
    `;
  }

  private _chart(ratings: Rating[]) {
    const SIZE = 100;
    const PAD = 6;
    const xOf = (v: number) => PAD + ((v + 1) / 2) * (SIZE - PAD * 2);
    const yOf = (a: number) => PAD + ((1 - a) / 2) * (SIZE - PAD * 2);
    const cx = xOf(0);
    const cy = yOf(0);
    const n = ratings.length;

    // Plotted points in SVG coords.
    const pts: Pt[] = ratings.map(r => ({ x: xOf(r.v), y: yOf(r.a) }));

    // Convex hull (≥ 3 unique points required).
    const hullPts = n >= 3 ? convexHull(pts) : [];
    const hullPath = hullPts.length >= 3
      ? hullPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
      : null;

    // Connecting segments — fade by age.
    const segs = pts.slice(1).map((p, i) => {
      const prev = pts[i]!;
      const age = n > 1 ? (i + 1) / (n - 1) : 1;
      const opacity = 0.10 + age * 0.55;
      return svg`<line class="seg"
        x1="${prev.x.toFixed(1)}" y1="${prev.y.toFixed(1)}"
        x2="${p.x.toFixed(1)}"    y2="${p.y.toFixed(1)}"
        opacity="${opacity.toFixed(2)}"
      />`;
    });

    // Dots — fade by age.
    const dots = pts.map((p, i) => {
      const age = n > 1 ? i / (n - 1) : 1;
      const opacity = 0.18 + age * 0.82;
      return svg`<circle class="dot"
        cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}"
        r="1.7"
        opacity="${opacity.toFixed(2)}"
      />`;
    });

    return svg`
      <svg viewBox="0 0 ${SIZE} ${SIZE}" preserveAspectRatio="xMidYMid meet">
        <line class="axis" x1="${PAD}" y1="${cy}" x2="${SIZE - PAD}" y2="${cy}" />
        <line class="axis" x1="${cx}" y1="${PAD}" x2="${cx}" y2="${SIZE - PAD}" />
        ${hullPath ? svg`<polygon class="hull" points="${hullPath}" />` : nothing}
        ${segs}
        ${dots}
        <text class="axis-tick" x="${SIZE - PAD}" y="${cy + 4}" text-anchor="end">+V</text>
        <text class="axis-tick" x="${cx + 2}" y="${PAD + 3}">+A</text>
      </svg>
    `;
  }
}

// Andrew's monotone chain — O(n log n). Returns hull vertices in CCW order.
// Discards collinear points (cross product ≤ 0 condition).
function convexHull(points: Pt[]): Pt[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const n = sorted.length;
  if (n < 3) return sorted;

  const lower: Pt[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const p = sorted[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function cross(o: Pt, a: Pt, b: Pt): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

declare global {
  interface HTMLElementTagNameMap {
    'recipe-scatter': RecipeScatter;
  }
}
