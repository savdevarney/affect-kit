// Recipe: <recipe-cumulative> — total VA distance traveled, session by session.
//
// At each session i, plot the running sum of Euclidean distance in V/A space
// from session 0 through session i. Slope = current rate of movement.
// Plateaus = stretches where the state didn't move much. Steepening = the
// state has started moving more. The widget makes no claim about which is
// "good"; it just shows the data.
//
// Example code, not part of the affect-kit package surface.

import { LitElement, html, css, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Rating } from 'affect-kit';

@customElement('recipe-cumulative')
export class RecipeCumulative extends LitElement {
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
    .end-tick {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 0.62em;
      fill: #888;
    }
    svg { width: 100%; height: 56px; display: block; }
    .baseline { stroke: #e5e5e5; stroke-width: 0.6; stroke-dasharray: 3 3; }
    .curve    { fill: none; stroke: #1a1a1a; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
    .empty    { color: #bbb; font-size: 0.78em; }
  `;

  @property({ attribute: false }) ratings: Rating[] = [];

  override render() {
    const sorted = [...this.ratings].sort((a, b) => a.timestamp - b.timestamp);
    return html`
      <div class="panel">
        <p class="label">Cumulative V × A distance traveled</p>
        ${sorted.length < 2
          ? html`<p class="empty">Need at least 2 sessions.</p>`
          : this._chart(sorted)}
      </div>
    `;
  }

  private _chart(ratings: Rating[]) {
    const W = 100, H = 40, PAD = 3;
    const n = ratings.length;

    // Compute cumulative distance — Euclidean step in V/A space, summed.
    const cum: number[] = new Array(n);
    cum[0] = 0;
    for (let i = 1; i < n; i++) {
      const dv = ratings[i]!.v - ratings[i - 1]!.v;
      const da = ratings[i]!.a - ratings[i - 1]!.a;
      cum[i] = cum[i - 1]! + Math.hypot(dv, da);
    }
    const total = cum[n - 1]!;
    const yScale = total > 0 ? (H - PAD * 2) / total : 0;

    const xOf = (i: number) => PAD + (i / (n - 1)) * (W - PAD * 2);
    const yOf = (d: number) => H - PAD - d * yScale;

    const pts = cum.map((d, i) => `${xOf(i).toFixed(1)},${yOf(d).toFixed(1)}`).join(' ');

    return svg`
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <line class="baseline" x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" />
        <polyline class="curve" points="${pts}" />
      </svg>
      <div style="font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 0.68em; color: #888; margin-top: 0.3em">
        total: ${total.toFixed(2)} units
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'recipe-cumulative': RecipeCumulative;
  }
}
