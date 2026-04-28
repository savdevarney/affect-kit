import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Rating } from '../core/types';
import { averageRatings } from '../core/vad';
import './affect-kit-result'; // ensure result element is registered

/**
 * `<affect-kit-compare>` — paired side-by-side word-cloud / face / color
 * comparison of two ratings or two rating series. Each side is rendered by
 * an internal `<affect-kit-result>`, so the visual language is identical to
 * the rest of affect-kit.
 *
 * Each of `before` / `after` accepts either a single `Rating` (e.g. the
 * captured snapshot from a session) or a `Rating[]` (which the widget
 * averages with `averageRatings()` for you). This makes the widget useful
 * for both literal before/after pairs ("session start vs session end") and
 * windowed comparisons ("last month vs last week").
 *
 * ```html
 * <affect-kit-compare
 *   show-face color-mode
 *   before-label="First week"
 *   after-label="Last week"
 * ></affect-kit-compare>
 *
 * <script type="module">
 *   import 'affect-kit/compare';
 *   const cmp = document.querySelector('affect-kit-compare');
 *   cmp.before = firstWeekRatings;  // Rating[]
 *   cmp.after  = lastWeekRatings;   // Rating[]
 * </script>
 * ```
 *
 * The widget makes no claims about what the comparison "means" — it just
 * shows the two states side-by-side. Interpretation belongs to the user.
 */
@customElement('affect-kit-compare')
export class AffectKitCompare extends LitElement {
  static override styles = css`
    :host {
      display: block;
      container-type: inline-size;
      font-size: 1rem;
    }
    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1em;
    }
    @container (max-width: 480px) {
      .row { grid-template-columns: 1fr; }
    }
    .col {
      display: flex;
      flex-direction: column;
      gap: 0.45em;
      min-width: 0;
    }
    .caption {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #999;
      margin: 0 0 0 0.2em;
    }
  `;

  /**
   * Left side. A single `Rating` (rendered as-is) or a `Rating[]`
   * (averaged via `averageRatings()`). Property is `beforeRating` because
   * `before` is reserved on `Element`.
   */
  @property({ attribute: false })
  beforeRating: Rating | Rating[] | null = null;

  /** Right side. Same shape as {@link beforeRating}. */
  @property({ attribute: false })
  afterRating: Rating | Rating[] | null = null;

  /** Caption above the left rating. */
  @property({ type: String, attribute: 'before-label' })
  beforeLabel = 'Before';

  /** Caption above the right rating. */
  @property({ type: String, attribute: 'after-label' })
  afterLabel = 'After';

  /** Forwarded to each `<affect-kit-result>`. */
  @property({ type: Boolean, attribute: 'show-face' })
  showFace = false;

  /** Forwarded to each `<affect-kit-result>`. */
  @property({ type: Boolean, attribute: 'color-mode' })
  colorMode = false;

  /** Forwarded to each `<affect-kit-result>`. Defaults true. */
  @property({ type: Boolean, attribute: 'show-labels' })
  showLabels = true;

  private _resolve(input: Rating | Rating[] | null): Rating | null {
    if (!input) return null;
    if (Array.isArray(input)) return averageRatings(input);
    return input;
  }

  override render() {
    const left  = this._resolve(this.beforeRating);
    const right = this._resolve(this.afterRating);

    return html`
      <div class="row">
        <div class="col">
          <p class="caption">${this.beforeLabel}</p>
          <affect-kit-result
            .rating=${left}
            ?show-face=${this.showFace}
            ?color-mode=${this.colorMode}
            ?show-labels=${this.showLabels}
          ></affect-kit-result>
        </div>
        <div class="col">
          <p class="caption">${this.afterLabel}</p>
          <affect-kit-result
            .rating=${right}
            ?show-face=${this.showFace}
            ?color-mode=${this.colorMode}
            ?show-labels=${this.showLabels}
          ></affect-kit-result>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affect-kit-compare': AffectKitCompare;
  }
}
