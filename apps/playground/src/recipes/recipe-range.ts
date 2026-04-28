// Recipe: <recipe-range> — affective-range visualisation from a Rating[] series.
// Example code, not part of the affect-kit package surface.
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { computeLongitudinalSummary } from './longitudinal';
import type { Rating } from 'affect-kit';

const MIN_SESSIONS = 5;

@customElement('recipe-range')
export class RecipeRange extends LitElement {
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
    .sub {
      font-size: 0.78em;
      color: #999;
      margin: 0 0 1.1em;
      line-height: 1.4;
    }

    /* Segmented bar */
    .bar-wrap {
      margin-top: 0.75em;
    }
    .bar {
      display: flex;
      height: 10px;
      border-radius: 5px;
      overflow: hidden;
      gap: 2px;
      background: #f0f0f0;
    }
    .seg {
      height: 100%;
      border-radius: 5px;
      transition: flex 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .seg.positive { background: #a8c8a0; }
    .seg.neutral  { background: #d8d8d8; }
    .seg.negative { background: #c8a0a0; }

    .bar-legend {
      display: flex;
      justify-content: space-between;
      margin-top: 0.55em;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 0.62em;
      color: #aaa;
      letter-spacing: 0.04em;
    }
    .bar-legend .pos { color: #7aaa70; }
    .bar-legend .neg { color: #b07070; }

    /* VA scatter */
    .scatter {
      width: 100%;
      aspect-ratio: 1;
      max-width: 120px;
      overflow: visible;
      margin-top: 0.75em;
    }
    .scatter-axis { stroke: #ebebeb; stroke-width: 1; }
    .scatter-dot  { transition: opacity 0.3s ease; }

    .empty {
      color: #bbb;
      font-size: 0.85em;
      line-height: 1.6;
    }
    .empty strong { color: #aaa; font-weight: 600; }
  `;

  @property({ attribute: false }) ratings: Rating[] = [];

  override render() {
    const { range, sessionCount } = computeLongitudinalSummary(this.ratings);
    const needed = MIN_SESSIONS - sessionCount;

    return html`
      <div class="panel">
        <p class="label">Range</p>
        ${!range ? html`
          <p class="empty">
            <strong>${needed} more check-in${needed === 1 ? '' : 's'}</strong>
            to see the breadth of your emotional experience.
          </p>
        ` : this._renderRange(range)}
      </div>
    `;
  }

  private _renderRange(r: NonNullable<ReturnType<typeof computeLongitudinalSummary>['range']>) {
    const suppressed = r.negativeRatio < 0.05;
    const stuckNeg   = r.negativeRatio > 0.6;

    const statusLabel = stuckNeg   ? 'Narrow — heavy'
                      : suppressed ? 'Narrow — light'
                      : r.score > 0.65 ? 'Wide'
                      : 'Moderate';

    const sub = stuckNeg
      ? 'Most check-ins have been in a difficult place. You\'re not alone in that.'
      : suppressed
      ? 'You\'ve been reporting mostly positive states. Occasional hard feelings are healthy and normal.'
      : r.score > 0.65
      ? 'You\'re visiting a genuine mix of emotional states — that\'s a sign of emotional honesty.'
      : 'A moderate range of emotional experience across your check-ins.';

    const pos = Math.round(r.positiveRatio * 100);
    const neg = Math.round(r.negativeRatio * 100);
    const neu = 100 - pos - neg;

    return html`
      <p class="status">${statusLabel}</p>
      <p class="sub">${sub}</p>

      <div class="bar-wrap">
        <div class="bar">
          <div class="seg positive" style="flex:${r.positiveRatio}"></div>
          <div class="seg neutral"  style="flex:${r.neutralRatio}"></div>
          <div class="seg negative" style="flex:${r.negativeRatio}"></div>
        </div>
        <div class="bar-legend">
          <span class="pos">${pos}% positive</span>
          <span>${neu}% neutral</span>
          <span class="neg">${neg}% difficult</span>
        </div>
      </div>

      ${this._scatter(r.vaPoints)}
    `;
  }

  private _scatter(points: Array<{ v: number; a: number; age: number }>) {
    if (points.length === 0) return nothing;
    const S = 80;
    const toX = (v: number) => ((v + 1) / 2) * S;
    const toY = (a: number) => ((1 - a) / 2) * S;

    return html`
      <svg class="scatter" viewBox="0 0 ${S} ${S}" aria-hidden="true">
        <line class="scatter-axis" x1="${S / 2}" y1="0" x2="${S / 2}" y2="${S}" />
        <line class="scatter-axis" x1="0" y1="${S / 2}" x2="${S}" y2="${S / 2}" />
        ${points.map(p => html`
          <circle
            class="scatter-dot"
            cx="${toX(p.v).toFixed(1)}"
            cy="${toY(p.a).toFixed(1)}"
            r="${(1.5 + p.age * 2).toFixed(1)}"
            fill="#1a1a1a"
            opacity="${(0.15 + p.age * 0.65).toFixed(2)}"
          />
        `)}
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'recipe-range': RecipeRange;
  }
}
