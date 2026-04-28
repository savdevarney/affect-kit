import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Rating } from '../core/types';
import { averageRatings } from '../core/vad';
import { colorForVA } from '../core/color';
import './affect-kit-result'; // ensure result element is registered

/**
 * `<affect-kit-compare>` — paired side-by-side word-cloud / face / color
 * comparison of two ratings or two rating series, rendered as a *single
 * card* with two halves separated by a thin divider. When `color-mode`
 * is on, the card background is a gradient from the left rating's V/A
 * color to the right rating's V/A color — the transition itself becomes
 * part of the visual story.
 *
 * Each of `beforeRating` / `afterRating` accepts either a single `Rating`
 * (rendered as-is) or a `Rating[]` (averaged with `averageRatings()` for
 * you). Useful for both literal before/after pairs ("session start vs
 * session end") and windowed comparisons ("last month vs last week").
 *
 * Property names are `beforeRating` / `afterRating` because `before` and
 * `after` are reserved on `Element`. Captions are controlled separately
 * via the `before-label` and `after-label` attributes.
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
 *   cmp.beforeRating = firstWeekRatings;  // Rating | Rating[]
 *   cmp.afterRating  = lastWeekRatings;   // Rating | Rating[]
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
    .panel {
      position: relative;
      background: white;
      border-radius: 1.5em;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04);
      overflow: hidden;
      isolation: isolate;
    }
    /*
     * The gradient layer paints the V/A → color transition from one side
     * to the other. Sits behind content; opacity matches the per-card
     * glow used by <affect-kit-result>. Direction comes from --_dir,
     * which the container query below flips on narrow viewports.
     */
    .gradient {
      --_dir: to right;
      position: absolute;
      inset: 0;
      opacity: 0;
      background: linear-gradient(var(--_dir), var(--_from, #f0f0f0), var(--_to, #f0f0f0));
      transition: opacity 0.5s ease;
      pointer-events: none;
      z-index: 0;
    }
    :host([color-mode]) .gradient { opacity: 0.85; }

    .row {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }
    .side {
      display: flex;
      flex-direction: column;
      gap: 0.5em;
      padding: 1.6em 1.8em;
      min-width: 0;
    }
    /* Divider between the two halves. Thin, low-contrast, no labels. */
    .side.left  { border-right:  1px solid rgba(0,0,0,0.08); }

    .caption {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #999;
      margin: 0;
    }
    /* Right-align the right caption only when in side-by-side row mode. */
    .side.right .caption { text-align: right; }

    /*
     * On narrow containers, stack vertically. Divider becomes horizontal,
     * gradient direction flips top-to-bottom (set inline from JS).
     */
    @container (max-width: 540px) {
      .row { grid-template-columns: 1fr; }
      .side.left {
        border-right: none;
        border-bottom: 1px solid rgba(0,0,0,0.08);
      }
      /* Reset right-caption alignment to left when stacked. */
      .side.right .caption { text-align: left; }
      .gradient { --_dir: to bottom; }
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

  /**
   * When on, the card background is a gradient from the left rating's
   * V/A color to the right rating's V/A color.
   */
  @property({ type: Boolean, attribute: 'color-mode', reflect: true })
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

    // Gradient end-stops. Fall back to a low-saturation neutral if a side
    // is null so the gradient still produces *something* sensible.
    const lc = left  ? colorForVA(left.pad.v,  left.pad.a)  : [240, 240, 240] as const;
    const rc = right ? colorForVA(right.pad.v, right.pad.a) : [240, 240, 240] as const;
    // Feed end-stops via custom properties so the gradient direction
    // (also a custom property, flipped by the container query) and the
    // colors compose without a conflicting inline `background`.
    const gradientStyle =
      `--_from: rgb(${lc[0]},${lc[1]},${lc[2]});` +
      `--_to: rgb(${rc[0]},${rc[1]},${rc[2]});`;

    return html`
      <div class="panel">
        <div class="gradient" style=${gradientStyle}></div>
        <div class="row">
          <div class="side left">
            <p class="caption">${this.beforeLabel}</p>
            <affect-kit-result
              bare
              .rating=${left}
              ?show-face=${this.showFace}
              ?show-labels=${this.showLabels}
            ></affect-kit-result>
          </div>
          <div class="side right">
            <p class="caption">${this.afterLabel}</p>
            <affect-kit-result
              bare
              mirror
              .rating=${right}
              ?show-face=${this.showFace}
              ?show-labels=${this.showLabels}
            ></affect-kit-result>
          </div>
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
