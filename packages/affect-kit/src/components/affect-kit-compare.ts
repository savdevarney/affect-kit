import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import type { ColorMode, Rating } from '../core/types';
import { colorForVA } from '../core/color';
import { colorModeConverter } from '../core/color-mode';

/**
 * `<affect-kit-compare>` — paired side-by-side word-cloud / face / color
 * comparison of two ratings or two rating series, rendered as a *single
 * card* with two halves separated by a thin divider. When `color-mode`
 * is on, the card background is a gradient from the left rating's V/A
 * color to the right rating's V/A color — the transition itself becomes
 * part of the visual story.
 *
 * Layout responds to host width via container queries (no JS): side-by-side
 * when wide, stacked when narrow. Each half's face sits on the *outer*
 * edge so the two faces frame the gradient — left/right when side-by-side,
 * top/bottom when stacked. The inner result widgets pick up the right
 * direction via CSS custom properties, so breakpoints stay aligned with
 * compare's own stacking and there is no "middle state" where compare is
 * side-by-side but each half is internally stacked.
 *
 * Each of `beforeRating` / `afterRating` accepts a single `Rating`. For
 * time-series comparisons ("last month vs last week"), call
 * `averageRatings()` upstream and pass the result. The component never
 * aggregates internally — averaging on every render is a perf footgun
 * for large arrays, and consumers have the context (windowing,
 * memoization) the component doesn't.
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
 *   import { averageRatings } from 'affect-kit';
 *
 *   const cmp = document.querySelector('affect-kit-compare');
 *   cmp.beforeRating = averageRatings(firstWeekRatings);
 *   cmp.afterRating  = averageRatings(lastWeekRatings);
 * </script>
 * ```
 *
 * The widget makes no claims about what the comparison "means" — it just
 * shows the two states side-by-side. Interpretation belongs to the user.
 */
export class AffectKitCompare extends LitElement {
  static override styles = css`
    :host {
      display: block;
      container-type: inline-size;
      font-family: inherit;
      font-size: var(--affect-kit-font-size, 1rem);
      /* Cap so the widget doesn't stretch ugly in wide layouts. Override
         via the custom property if you need something different. */
      max-width: var(--affect-kit-compare-max-width, 880px);
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
     * to the other. Stops are placed at 30% / 70% so each side keeps a
     * generous solid block of its own saturated color before the blend
     * starts — making the transition feel like a soft handoff rather
     * than a continuous wash, and keeping each side's color readable
     * regardless of which two V/A colors got picked. Sits behind
     * content; opacity matches the per-card glow used by
     * <affect-kit-result>. Direction comes from --_grad-dir, which the
     * container query below flips when stacked.
     */
    .gradient {
      --_grad-dir: to right;
      position: absolute;
      inset: 0;
      opacity: 0;
      background: linear-gradient(
        var(--_grad-dir),
        var(--_from, #f0f0f0) 0%,
        var(--_from, #f0f0f0) 30%,
        var(--_to, #f0f0f0) 70%,
        var(--_to, #f0f0f0) 100%
      );
      transition: opacity 0.5s ease;
      pointer-events: none;
      z-index: 0;
    }
    :host([color-mode]) .gradient { opacity: 0.85; }

    /*
     * Layout strategy: STACKED is the default — the layout that always
     * fits at any width. Side-by-side is *unlocked* at one of two
     * container-query thresholds depending on what content is visible:
     *
     *   - Both face and labels shown → unlock at 720px
     *     (each side needs room for a face + words side-by-side)
     *   - Only face *or* only labels   → unlock at 380px
     *     (each side only has one content type; below this is "xs"
     *     territory where even single-content stacks still help readability)
     *
     * Keeping STACKED as the default means we write each set of style
     * values in *one place*; the side-by-side block below appears twice
     * (once per threshold) but flips them all together, so adding a new
     * style is a one-line change in the default + a single line in each
     * unlock block.
     */

    .row {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 1fr;  /* STACKED default */
      gap: 0;
    }
    .side {
      display: flex;
      flex-direction: column;
      gap: 0.7em;
      padding: 1.6em 1.8em;
      min-width: 0;
    }
    /* Divider (STACKED default — sits below the top half). */
    .side.left {
      border-right: none;
      border-bottom: 1px solid rgba(0,0,0,0.08);
    }
    /* Gradient flow (STACKED default — top to bottom). */
    .gradient { --_grad-dir: to bottom; }

    /* White-pill captions; dark text stays legible against any V/A color. */
    .caption {
      display: inline-block;
      align-self: center;  /* STACKED default — centered above each half */
      background: white;
      color: #1a1a1a;
      font-family: inherit;
      font-size: 0.62em;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 0.35em 0.7em;
      border-radius: 999px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.06);
      margin: 0;
    }

    /*
     * Inner result — STACKED default flows column-then-mirror.
     * Compare's gradient panel is the visible card, so we suppress each
     * inner result's chrome and glow via the result's documented CSS
     * custom properties (no public prop on result needed).
     */
    affect-kit-result {
      --_panel-bg: transparent;
      --_panel-padding: 0;
      --_panel-shadow: none;
      --_panel-radius: 0;
      --_panel-overflow: visible;
      --_glow-display: none;
      max-width: none;

      --_face-dir: column;
      --_face-align: stretch;
      --_face-gap: 0;
      --_face-step: 0.75em;
      --_face-mb: 0.5em;
      --_face-mt: 0;
    }
    /* Right side mirrors so each face sits on the outer edge. */
    .side.right affect-kit-result {
      --_face-dir: column-reverse;
      --_face-mb: 0;
      --_face-mt: 0.5em;
    }

    /*
     * Unlock side-by-side. Two blocks, same body — kept in sync by
     * convention. CSS nesting keeps each block tight; the only thing
     * that differs between them is the @container threshold and
     * (for the second) a :where() selector that gates the rule on
     * the content being light enough to need only the narrower
     * threshold.
     */
    @container (min-width: 720px) {
      .row { grid-template-columns: 1fr 1fr; }
      .side.left {
        border-right: 1px solid rgba(0,0,0,0.08);
        border-bottom: none;
      }
      .gradient { --_grad-dir: to right; }
      .side .caption { align-self: flex-start; }
      .side.right .caption { align-self: flex-end; }
      affect-kit-result {
        --_face-dir: row;
        --_face-align: center;
        --_face-gap: 2em;
        --_face-step: 0.5em;
        --_face-mb: 0;
        --_face-mt: 0;
      }
      .side.right affect-kit-result { --_face-dir: row-reverse; }
    }

    /* Light content (face OR labels off) — unlock side-by-side at 380px.
       Below that is "xs" territory where stacked still reads better. */
    @container (min-width: 380px) {
      :host(:where(:not([show-face]), :not([show-labels]))) {
        & .row { grid-template-columns: 1fr 1fr; }
        & .side.left {
          border-right: 1px solid rgba(0,0,0,0.08);
          border-bottom: none;
        }
        & .gradient { --_grad-dir: to right; }
        & .side .caption { align-self: flex-start; }
        & .side.right .caption { align-self: flex-end; }
        & affect-kit-result {
          --_face-dir: row;
          --_face-align: center;
          --_face-gap: 2em;
          --_face-step: 0.5em;
          --_face-mb: 0;
          --_face-mt: 0;
        }
        & .side.right affect-kit-result { --_face-dir: row-reverse; }
      }
    }
  `;

  /**
   * Left side. A single `Rating` to render. For time-series, call
   * `averageRatings()` upstream and pass the result here — the component
   * never aggregates internally (would re-run on every render).
   * Property is `beforeRating` because `before` is reserved on `Element`.
   */
  @property({ attribute: false })
  beforeRating: Rating | null = null;

  /** Right side. Same shape as {@link beforeRating}. */
  @property({ attribute: false })
  afterRating: Rating | null = null;

  /** Caption above the left rating. */
  @property({ type: String, attribute: 'before-label' })
  beforeLabel = 'Before';

  /** Caption above the right rating. */
  @property({ type: String, attribute: 'after-label' })
  afterLabel = 'After';

  /** Forwarded to each `<affect-kit-result>`. Reflected so CSS rules
      below can branch on which content types are visible. */
  @property({ type: Boolean, attribute: 'show-face', reflect: true })
  showFace = false;

  /**
   * Color treatment. See {@link ColorMode}.
   * - `'background'` — card is a gradient between the two ratings' V/A colors.
   * - `'words'` — outer card stays neutral; each word inside picks up its
   *   own lexicon color. Useful when averaging many ratings would wash the
   *   background to gray.
   * - `null` — no color.
   */
  @property({ converter: colorModeConverter, attribute: 'color-mode', reflect: true })
  colorMode: ColorMode | null = null;

  /** Forwarded to each `<affect-kit-result>`. Defaults true. Reflected
      so CSS rules can branch on which content types are visible. */
  @property({ type: Boolean, attribute: 'show-labels', reflect: true })
  showLabels = true;

  override render() {
    const left  = this.beforeRating;
    const right = this.afterRating;

    // Outer gradient only paints in 'background' mode. In 'words' mode the
    // color story lives on the individual labels, so the card stays neutral.
    const showGradient = this.colorMode === 'background';
    const lc = left  ? colorForVA(left.face.v,  left.face.a)  : [240, 240, 240] as const;
    const rc = right ? colorForVA(right.face.v, right.face.a) : [240, 240, 240] as const;
    const gradientStyle = showGradient
      ? `--_from: rgb(${lc[0]},${lc[1]},${lc[2]});--_to: rgb(${rc[0]},${rc[1]},${rc[2]});`
      : '';

    // Each inner result also gets the words/background/null mode. We pass
    // it as a string attribute so the inner result's CSS attribute selectors
    // (`:host([color-mode="words"])`) trigger.
    const innerColorMode = this.colorMode;

    return html`
      <div class="panel">
        ${showGradient ? html`<div class="gradient" style=${gradientStyle}></div>` : ''}
        <div class="row">
          <div class="side left">
            <p class="caption">${this.beforeLabel}</p>
            <affect-kit-result
              .rating=${left}
              .colorMode=${innerColorMode}
              ?show-face=${this.showFace}
              ?show-labels=${this.showLabels}
            ></affect-kit-result>
          </div>
          <div class="side right">
            <p class="caption">${this.afterLabel}</p>
            <affect-kit-result
              .rating=${right}
              .colorMode=${innerColorMode}
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
