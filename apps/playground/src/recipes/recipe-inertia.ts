// Recipe: <recipe-inertia> — visualise emotional inertia from a Rating[] series.
// Example code, not part of the affect-kit package surface. See ./longitudinal.ts
// for the underlying math.
import { LitElement, html, css, nothing, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { computeLongitudinalSummary } from './longitudinal';
import type { Rating } from 'affect-kit';

const MIN_SESSIONS = 5;

@customElement('recipe-inertia')
export class RecipeInertia extends LitElement {
  static override styles = css`
    :host {
      display: block;
      container-type: inline-size;
      font-size: 1rem;
    }
    .panel {
      background: white;
      border-radius: 1.25em;
      padding: 1.5em 1.75em;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04);
    }
    .label {
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #bbb;
      margin: 0 0 0.5em;
    }
    .status {
      font-size: 1.5em;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin: 0 0 0.2em;
      color: #1a1a1a;
    }
    .status.stuck { color: #c97a2a; }
    .sub {
      font-size: 0.78em;
      color: #999;
      margin: 0 0 1.1em;
      line-height: 1.4;
    }
    .sparkline {
      width: 100%;
      height: 56px;
      overflow: visible;
    }
    .spark-line   { fill: none; stroke: #1a1a1a; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .spark-zero   { stroke: #e5e5e5; stroke-width: 1; stroke-dasharray: 3 3; }
    .spark-stuck  { fill: rgba(201,122,42,0.10); stroke: none; }
    .spark-dot    { fill: #1a1a1a; }
    .spark-dot.stuck { fill: #c97a2a; }

    .empty {
      color: #bbb;
      font-size: 0.85em;
      line-height: 1.6;
    }
    .empty strong { color: #aaa; font-weight: 600; }
  `;

  @property({ attribute: false }) ratings: Rating[] = [];

  override render() {
    const { inertia, sessionCount } = computeLongitudinalSummary(this.ratings);
    const needed = MIN_SESSIONS - sessionCount;

    return html`
      <div class="panel">
        <p class="label">Inertia</p>
        ${!inertia ? html`
          <p class="empty">
            <strong>${needed} more check-in${needed === 1 ? '' : 's'}</strong>
            to see how your mood moves over time.
          </p>
        ` : this._renderInertia(inertia)}
      </div>
    `;
  }

  private _renderInertia(m: NonNullable<ReturnType<typeof computeLongitudinalSummary>['inertia']>) {
    const label = m.isCurrentlyStuck
      ? `Stuck — ${m.stuckStreak} sessions`
      : m.score > 0.6 ? 'Moving'
      : m.score > 0.3 ? 'Steady'
      : 'Very steady';

    const sub = m.isCurrentlyStuck
      ? `You've been in a tough spot for ${m.stuckStreak} check-ins. That's worth noticing.`
      : m.score > 0.6
      ? 'Your emotional state is shifting — you\'re responding to life as it changes.'
      : 'Your emotional state has been fairly consistent lately.';

    return html`
      <p class="status${m.isCurrentlyStuck ? ' stuck' : ''}">${label}</p>
      <p class="sub">${sub}</p>
      ${this._sparkline(m.sparkline, m.isCurrentlyStuck)}
    `;
  }

  private _sparkline(values: number[], stuck: boolean) {
    if (values.length < 2) return nothing;
    const W = 100;
    const H = 40;
    const PAD = 4;
    const n = values.length;

    const xOf = (i: number) => PAD + (i / (n - 1)) * (W - PAD * 2);
    // v in [-1,1] → y in [H-PAD, PAD]
    const yOf = (v: number) => PAD + ((1 - v) / 2) * (H - PAD * 2);
    const zeroY = yOf(0);

    const pts = values.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
    const lastX = xOf(n - 1);
    const lastY = yOf(values[n - 1]!);

    // Stuck region: shade area below zero for the stuck streak tail
    const stuckRect = (stuck && values.length >= 3) ? (() => {
      const stuckStart = values.length - (this._stuckStreak(values));
      const sx = xOf(Math.max(0, stuckStart - 1));
      return svg`
        <rect class="spark-stuck"
          x="${sx.toFixed(1)}" y="${zeroY.toFixed(1)}"
          width="${(W - PAD - sx).toFixed(1)}"
          height="${(H - PAD - zeroY).toFixed(1)}"
        />
      `;
    })() : nothing;

    return html`
      <svg class="sparkline" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        ${stuckRect}
        <line class="spark-zero" x1="${PAD}" y1="${zeroY.toFixed(1)}" x2="${W - PAD}" y2="${zeroY.toFixed(1)}" />
        <polyline class="spark-line" points="${pts}" />
        <circle class="${'spark-dot' + (stuck ? ' stuck' : '')}"
          cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="2.8" />
      </svg>
    `;
  }

  private _stuckStreak(values: number[]): number {
    let n = 0;
    for (let i = values.length - 1; i >= 0; i--) {
      if (values[i]! < -0.3) n++;
      else break;
    }
    return n;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'recipe-inertia': RecipeInertia;
  }
}
