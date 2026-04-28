// Recipe: <recipe-scatter> — VA scatter with time-decayed dot opacity.
// Faint cross-axis at origin, no quadrant fills, no quadrant labels.
// The viewer reads the trajectory; the widget makes no claims about
// what each region "means."
//
// Example code, not part of the affect-kit package surface.

import { LitElement, html, css, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Rating } from 'affect-kit';

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
      max-width: 200px;
      height: auto;
      display: block;
      margin: 0.4em auto;
    }
    .axis  { stroke: #e5e5e5; stroke-width: 0.4; }
    .dot   { fill: #1a1a1a; }
    .empty { color: #bbb; font-size: 0.78em; }
  `;

  @property({ attribute: false }) ratings: Rating[] = [];

  override render() {
    const sorted = [...this.ratings].sort((a, b) => a.timestamp - b.timestamp);
    return html`
      <div class="panel">
        <p class="label">V × A scatter (older → newer)</p>
        ${sorted.length === 0
          ? html`<p class="empty">No sessions.</p>`
          : this._chart(sorted)}
      </div>
    `;
  }

  private _chart(ratings: Rating[]) {
    const SIZE = 100;
    const PAD = 6;
    // V/A in [-1, 1] → x/y in [PAD, SIZE-PAD]
    const xOf = (v: number) => PAD + ((v + 1) / 2) * (SIZE - PAD * 2);
    const yOf = (a: number) => PAD + ((1 - a) / 2) * (SIZE - PAD * 2);
    const cx = xOf(0);
    const cy = yOf(0);

    const n = ratings.length;
    const dots = ratings.map((r, i) => {
      const age = n > 1 ? i / (n - 1) : 1; // 0 = oldest, 1 = newest
      const opacity = 0.18 + age * 0.82;   // 0.18 → 1.0
      return svg`<circle class="dot"
        cx="${xOf(r.v).toFixed(1)}"
        cy="${yOf(r.a).toFixed(1)}"
        r="1.6"
        opacity="${opacity.toFixed(2)}"
      />`;
    });

    return svg`
      <svg viewBox="0 0 ${SIZE} ${SIZE}" preserveAspectRatio="xMidYMid meet">
        <line class="axis" x1="${PAD}" y1="${cy}" x2="${SIZE - PAD}" y2="${cy}" />
        <line class="axis" x1="${cx}" y1="${PAD}" x2="${cx}" y2="${SIZE - PAD}" />
        ${dots}
        <text class="axis-tick" x="${SIZE - PAD}" y="${cy + 4}" text-anchor="end">+V</text>
        <text class="axis-tick" x="${cx + 2}" y="${PAD + 3}">+A</text>
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'recipe-scatter': RecipeScatter;
  }
}
