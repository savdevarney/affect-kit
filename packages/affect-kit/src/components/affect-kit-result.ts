import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { colorForVA } from '../core/color';
import type { Rating } from '../core/types';
import './affect-kit-face'; // ensure face element is registered

const animateConverter = {
  fromAttribute: (value: string | null): boolean => value !== 'false',
  toAttribute: (value: boolean): string | null => (value ? null : 'false'),
};

/**
 * `<affect-kit-result>` — display panel for a captured rating.
 *
 * ```html
 * <affect-kit-result show-face show-labels show-color></affect-kit-result>
 * <script type="module">
 *   document.querySelector('affect-kit-result').rating = capturedRating;
 * </script>
 * ```
 *
 * Emotion words are sized by intensity level: level-3 is the headline word
 * in a display serif; level-1 is a quiet supporting word in body weight.
 * Color glow matches the V/A quadrant (pink/gold/green/blue) when `show-color`.
 */
@customElement('affect-kit-result')
export class AffectKitResult extends LitElement {
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
      padding: 2.4em 3em;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04);
    }
    .panel.compact { padding: 1.4em 1.75em; }

    .glow {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0;
      z-index: 0;
      transition: opacity 0.5s ease, background 50ms linear;
    }
    .glow.on { opacity: 0.85; }

    .content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
    }

    .face-zone {
      flex: 0 0 auto;
      width: 9em;
      aspect-ratio: 1;
      align-self: center;
      margin-bottom: 0.6em;
      position: relative;
    }
    affect-kit-face {
      position: absolute;
      inset: 0;
      margin: auto;
      width: 92%;
      height: 92%;
      filter: drop-shadow(0 0.5em 1.4em rgba(0,0,0,0.13));
      pointer-events: none;
    }

    .words {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4em 1.5em;
      align-items: baseline;
      line-height: 1.15;
      min-height: 2.5em;
      color: var(--affect-kit-ink, #1a1a1a);
    }

    .word.level-1 { font-size: 1em;     font-weight: 400; opacity: 0.55; }
    .word.level-2 { font-size: 1.625em; font-weight: 500; opacity: 0.82; }
    .word.level-3 {
      font-family: var(--affect-kit-font-display, 'DM Serif Display', Georgia, serif);
      font-size: 2.5em;
      font-weight: 400;
      letter-spacing: -0.01em;
      opacity: 1;
    }

    .align-center .words { justify-content: center; }
    .align-right  .words { justify-content: flex-end; }

    .vad {
      display: flex;
      gap: 1.4em;
      margin-top: 1.6em;
      padding-top: 1em;
      border-top: 1px solid rgba(0,0,0,0.06);
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 0.625em;
      color: #6b7280;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .align-center .vad { justify-content: center; }
    .align-right  .vad { justify-content: flex-end; }

    /* Wide panels: face left, words right */
    @container (min-width: 360px) {
      .content.has-face {
        flex-direction: row;
        align-items: center;
        gap: 2em;
      }
      .content.has-face .face-zone { margin-bottom: 0; }
      .content.has-face .words     { flex: 1 1 auto; }
    }
  `;

  /** The captured rating to display. Required for any visible content. */
  @property({ attribute: false })
  rating: Rating | null = null;

  /** Show the face glyph. */
  @property({ type: Boolean, attribute: 'show-face' })
  showFace = false;

  /** Show the selected emotion words. */
  @property({ type: Boolean, attribute: 'show-labels' })
  showLabels = true;

  /** Apply a color tint matching the rating's V/A position. */
  @property({ type: Boolean, attribute: 'show-color' })
  showColor = false;

  /** Show the raw V/A/D readout (debug). */
  @property({ type: Boolean, attribute: 'show-vad' })
  showVad = false;

  /** Word alignment. */
  @property({ type: String })
  align: 'left' | 'center' | 'right' = 'center';

  /** Sizing preset. */
  @property({ type: String })
  variant: 'default' | 'compact' = 'default';

  /**
   * Breath animation on the face glyph. Defaults `true`.
   * Respects `prefers-reduced-motion: reduce` automatically.
   */
  @property({ converter: animateConverter, reflect: true })
  animated = true;

  override render() {
    const r = this.rating;
    if (!r) return nothing;

    const [cr, cg, cb] = colorForVA(r.v, r.a);
    const glowStyle = this.showColor
      ? `background: rgb(${cr},${cg},${cb})`
      : '';

    return html`
      <div class="panel${this.variant === 'compact' ? ' compact' : ''}">
        <div
          class="glow${this.showColor ? ' on' : ''}"
          style="${glowStyle}"
        ></div>
        <div class="content align-${this.align}${this.showFace ? ' has-face' : ''}">

          ${this.showFace ? html`
            <div class="face-zone">
              <affect-kit-face
                .v=${r.v}
                .a=${r.a}
                .animated=${this.animated}
              ></affect-kit-face>
            </div>
          ` : nothing}

          ${this.showLabels && r.labels.length > 0 ? html`
            <div class="words">
              ${r.labels.map(l => html`
                <span class="word level-${l.level}">${l.name}</span>
              `)}
            </div>
          ` : nothing}

          ${this.showVad ? html`
            <div class="vad">
              <span>V ${r.v.toFixed(2)}</span>
              <span>A ${r.a.toFixed(2)}</span>
              <span>D ${r.d.toFixed(2)}</span>
            </div>
          ` : nothing}

        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affect-kit-result': AffectKitResult;
  }
}
