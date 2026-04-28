import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
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
 * Layout responds to host width: side-by-side when wide, stacked when
 * narrow. Each half's face sits on the *outer* edge so the two faces
 * frame the gradient — left face on the left in row mode, top face on
 * the top in stacked mode (and the other half mirrors).
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
  /**
   * Below this host width (px), the two halves stack vertically. Picked so
   * that each half in side-by-side mode is at least ~360px — comfortable
   * room for face + words side-by-side via the inner result's row layout.
   */
  private static readonly STACK_BREAKPOINT = 720;

  static override styles = css`
    :host {
      display: block;
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
     * which we flip when the panel is in stacked mode.
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
    .panel.stacked .gradient { --_dir: to bottom; }

    .row {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }
    .panel.stacked .row { grid-template-columns: 1fr; }

    .side {
      display: flex;
      flex-direction: column;
      gap: 0.7em;
      padding: 1.6em 1.8em;
      min-width: 0;
    }
    /* Divider between the two halves. Thin, low-contrast, no labels. */
    .side.left { border-right: 1px solid rgba(0,0,0,0.08); }
    .panel.stacked .side.left {
      border-right: none;
      border-bottom: 1px solid rgba(0,0,0,0.08);
    }

    /*
     * Captions: white pill with dark text so they stay legible against
     * any V/A gradient color underneath.
     */
    .caption {
      display: inline-block;
      align-self: flex-start;
      background: white;
      color: #1a1a1a;
      font-size: 0.62rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 0.35em 0.7em;
      border-radius: 999px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.06);
      margin: 0;
    }
    /* Right caption hugs the right edge in row mode. */
    .panel:not(.stacked) .side.right .caption { align-self: flex-end; }
    /*
     * In stacked mode, the inner result is mirrored to column-reverse
     * (words above face). The caption stays at the top of the side —
     * top-to-bottom reads: caption, words, face.
     */
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

  /** Internal: true when the host is narrow enough to stack vertically. */
  @state() private _stacked = false;

  private _ro?: ResizeObserver;

  override connectedCallback(): void {
    super.connectedCallback();
    this._ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? this.offsetWidth;
      const next = w < AffectKitCompare.STACK_BREAKPOINT;
      if (next !== this._stacked) this._stacked = next;
    });
    this._ro.observe(this);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._ro?.disconnect();
    delete this._ro;
  }

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
    const gradientStyle =
      `--_from: rgb(${lc[0]},${lc[1]},${lc[2]});` +
      `--_to: rgb(${rc[0]},${rc[1]},${rc[2]});`;

    // Drive each inner result's layout explicitly from our stacked state,
    // so the breakpoints stay aligned: side-by-side compare ↔ row results,
    // stacked compare ↔ column results.
    const innerLayout: 'row' | 'column' = this._stacked ? 'column' : 'row';

    return html`
      <div class="panel${this._stacked ? ' stacked' : ''}">
        <div class="gradient" style=${gradientStyle}></div>
        <div class="row">
          <div class="side left">
            <p class="caption">${this.beforeLabel}</p>
            <affect-kit-result
              bare
              layout=${innerLayout}
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
              layout=${innerLayout}
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
