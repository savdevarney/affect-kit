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
 * Emotion words are sized by intensity level — size, weight, and opacity
 * interpolate continuously across [1, 3]. The display serif kicks in at
 * level ≥ 2.5. This makes the panel a drop-in word-cloud renderer when
 * fed averaged longitudinal data (e.g. an average level of 2.3 for "joy"
 * across many sessions).
 *
 * Color glow matches the V/A quadrant (pink/gold/green/blue) when `color-mode`.
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
    .panel.with-face { padding: 1.6em 2em; }

    /*
     * The 'bare' attribute strips panel chrome and the color glow so the
     * host widget (e.g. affect-kit-compare) can manage its own card and
     * its own background. Words and face still render normally.
     */
    :host([bare]) .panel {
      background: transparent;
      padding: 0;
      box-shadow: none;
      border-radius: 0;
      overflow: visible;
    }
    :host([bare]) .glow { display: none; }

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
      width: 7em;
      aspect-ratio: 1;
      align-self: center;
      margin-bottom: 0.5em;
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
      min-width: 0;
      color: var(--affect-kit-ink, #1a1a1a);
    }

    /*
     * Continuous level scaling. --_level is set inline per-word and clamped
     * into [1, 3]. --_level-step controls the size growth per integer step
     * (the row-with-face layout below shrinks it so level 3 caps at 2em).
     */
    .word {
      --_lv: clamp(1, var(--_level, 1), 3);
      font-size: calc(1em + (var(--_lv) - 1) * var(--_level-step, 0.75em));
      opacity:   calc(0.55 + (var(--_lv) - 1) * 0.225);
    }
    .word.display {
      font-family: var(--affect-kit-font-display, 'DM Serif Display', Georgia, serif);
      letter-spacing: -0.01em;
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

    /* Wide panels: face left, words right. Smaller step caps level 3 at 2em. */
    @container (min-width: 360px) {
      .content.has-face {
        flex-direction: row;
        align-items: center;
        gap: 2em;
        --_level-step: 0.5em;
      }
      .content.has-face .face-zone { margin-bottom: 0; }
      .content.has-face .words     { flex: 1 1 auto; min-width: 0; }
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
  @property({ type: Boolean, attribute: 'color-mode', reflect: true })
  colorMode = false;

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
   * Strip panel chrome (background, padding, shadow, radius) and the color
   * glow. Use when embedding this widget inside another that manages its
   * own card chrome — e.g. `<affect-kit-compare>`.
   */
  @property({ type: Boolean, reflect: true })
  bare = false;

  /**
   * Breath animation on the face glyph. Defaults `true`.
   * Respects `prefers-reduced-motion: reduce` automatically.
   */
  @property({ converter: animateConverter, reflect: true })
  animated = true;

  override render() {
    const r = this.rating;
    if (!r) return nothing;

    // Face shape and color always follow the raw pad gesture, not the
    // label-aggregated v/a — the visual represents WHERE the user placed
    // their feeling, not what words they chose afterward.
    const padV = r.pad.v;
    const padA = r.pad.a;
    const [cr, cg, cb] = colorForVA(padV, padA);
    const glowStyle = this.colorMode
      ? `background: rgb(${cr},${cg},${cb})`
      : '';

    return html`
      <div class="panel${this.variant === 'compact' ? ' compact' : ''}${this.showFace ? ' with-face' : ''}">
        <div
          class="glow${this.colorMode ? ' on' : ''}"
          style="${glowStyle}"
        ></div>
        <div class="content align-${this.align}${this.showFace ? ' has-face' : ''}">

          ${this.showFace ? html`
            <div class="face-zone">
              <affect-kit-face
                .v=${padV}
                .a=${padA}
                .animated=${this.animated}
              ></affect-kit-face>
            </div>
          ` : nothing}

          ${this.showLabels && r.labels.length > 0 ? html`
            <div class="words">
              ${r.labels.map(l => {
                const lv = Math.max(1, Math.min(3, l.level));
                // Triangle weight: peaks at lv=2 (500), drops to 400 at lv=1 and lv=3.
                // The display serif at high levels carries weight on its own; the
                // body sans needs the boost in the middle.
                const weight = Math.round(400 + 100 * (1 - Math.abs(lv - 2)));
                const isDisplay = lv >= 2.5;
                return html`
                  <span
                    class="word${isDisplay ? ' display' : ''}"
                    style="--_level:${lv};font-weight:${weight}"
                  >${l.name}</span>
                `;
              })}
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
