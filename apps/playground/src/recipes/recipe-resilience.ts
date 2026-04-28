// Recipe: <recipe-resilience> — recovery-arc visualisation from a Rating[] series.
// Example code, not part of the affect-kit package surface.
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { computeLongitudinalSummary } from './longitudinal';
import type { Rating } from 'affect-kit';

@customElement('recipe-resilience')
export class RecipeResilience extends LitElement {
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
    .stat {
      display: flex;
      align-items: baseline;
      gap: 0.3em;
      margin: 0 0 0.2em;
    }
    .number {
      font-size: 2.8em;
      font-weight: 700;
      letter-spacing: -0.04em;
      color: #1a1a1a;
      line-height: 1;
    }
    .unit {
      font-size: 0.85em;
      color: #999;
      font-weight: 400;
    }
    .sub {
      font-size: 0.78em;
      color: #999;
      margin: 0 0 1.1em;
      line-height: 1.4;
    }
    .arcs {
      display: flex;
      gap: 4px;
      align-items: flex-end;
      height: 32px;
      margin-top: 0.75em;
    }
    .arc-bar {
      flex: 1 1 0;
      border-radius: 3px 3px 0 0;
      background: #e8e8e8;
      min-width: 6px;
      transition: background 0.2s ease;
    }
    .arc-bar.ongoing { background: rgba(201,122,42,0.35); }

    .notice {
      font-size: 0.78em;
      color: #c97a2a;
      font-weight: 500;
      margin: 0.5em 0 0;
    }
    .empty {
      color: #bbb;
      font-size: 0.85em;
      line-height: 1.6;
    }
  `;

  @property({ attribute: false }) ratings: Rating[] = [];

  override render() {
    const { resilience } = computeLongitudinalSummary(this.ratings);

    return html`
      <div class="panel">
        <p class="label">Resilience</p>
        ${!resilience ? html`
          <p class="empty">
            No difficult patches recorded yet —
            this metric appears after your first tough stretch and recovery.
          </p>
        ` : this._renderResilience(resilience)}
      </div>
    `;
  }

  private _renderResilience(b: NonNullable<ReturnType<typeof computeLongitudinalSummary>['resilience']>) {
    const avg = b.avgRecoverySessions;
    const ongoing = b.arcs.at(-1)?.recoveredAtIndex === null;
    const ongoingLen = ongoing
      ? this.ratings.length - b.arcs.at(-1)!.startIndex
      : null;

    // Bar chart: each arc scaled to tallest
    const completed = b.arcs.filter(a => a.lengthSessions !== null);
    const maxLen = Math.max(1, ...completed.map(a => a.lengthSessions!));

    return html`
      ${avg !== null ? html`
        <div class="stat">
          <span class="number">${avg < 2 ? avg.toFixed(1) : Math.round(avg)}</span>
          <span class="unit">check-in${Math.round(avg ?? 0) === 1 ? '' : 's'} to bounce back</span>
        </div>
        <p class="sub">Average across ${completed.length} difficult
          patch${completed.length === 1 ? '' : 'es'}.</p>
      ` : html`
        <p class="sub">You've had a difficult patch but haven't fully bounced back yet.</p>
      `}

      ${completed.length > 0 ? html`
        <div class="arcs" title="Each bar = one recovery arc, height = sessions to bounce back">
          ${b.arcs.map(arc => {
            const isOngoing = arc.lengthSessions === null;
            const len = arc.lengthSessions ?? ongoingLen ?? 1;
            const pct = Math.max(12, (len / maxLen) * 100);
            return html`
              <div
                class="arc-bar${isOngoing ? ' ongoing' : ''}"
                style="height:${pct.toFixed(0)}%"
                title="${isOngoing ? `Ongoing (${len} sessions so far)` : `${len} session${len === 1 ? '' : 's'}`}"
              ></div>
            `;
          })}
        </div>
      ` : nothing}

      ${ongoing ? html`
        <p class="notice">You're in a difficult stretch right now (${ongoingLen} check-in${ongoingLen === 1 ? '' : 's'}).</p>
      ` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'recipe-resilience': RecipeResilience;
  }
}
