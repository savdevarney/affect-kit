import { LitElement, html, css, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { colorForVA, lighterForChips } from '../core/color';
import { colorModeConverter } from '../core/color-mode';
import { themeConverter } from '../core/theme';
import type { ColorMode, Rating, Theme } from '../core/types';
import { EMOTIONS_BY_NAME } from '../vocabulary/en';

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
export class AffectKitResult extends LitElement {
  static override styles = css`
    :host {
      display: block;
      container-type: inline-size;
      font-family: inherit;
      font-size: var(--affect-kit-font-size, 1rem);
      max-width: var(--affect-kit-result-max-width, 640px);

      /* Theme: --_ink and --_paper polarity. See affect-kit-rater. */
      --_ink:   #1a1a1a;
      --_paper: white;
      color: var(--_ink);
    }
    :host([theme="dark"]) {
      --_ink:   white;
      --_paper: #1a1a1a;
    }
    @media (prefers-color-scheme: dark) {
      :host([theme="auto"]) {
        --_ink:   white;
        --_paper: #1a1a1a;
      }
    }
    /*
     * Panel chrome is driven by CSS custom properties so a parent widget
     * (e.g. affect-kit-compare) can suppress it from the outside without
     * needing a dedicated prop on this element.
     */
    .panel {
      position: relative;
      background: var(--_panel-bg, var(--_paper));
      border-radius: var(--_panel-radius, 1.5em);
      padding: var(--_panel-padding, 2.4em 3em);
      overflow: var(--_panel-overflow, hidden);
      box-shadow: var(--_panel-shadow,
        0 1px 2px color-mix(in srgb, var(--_ink) 4%, transparent),
        0 8px 24px color-mix(in srgb, var(--_ink) 4%, transparent));
    }
    /* color-mode off → composable surface. The --_panel-bg / --_panel-shadow
       custom-property fallbacks remain external-override-friendly (compare
       still wins by setting them), but standalone result drops the card. */
    :host(:not([color-mode])) .panel {
      background: var(--_panel-bg, transparent);
      box-shadow: var(--_panel-shadow, none);
    }
    .panel.compact  { padding: var(--_panel-padding, 1.4em 1.75em); }
    .panel.with-face { padding: var(--_panel-padding, 1.6em 2em); }

    .glow {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0;
      z-index: 0;
      display: var(--_glow-display, block);
      transition: opacity 0.5s ease, background 50ms linear;
    }
    .glow.on { opacity: 0.85; }

    .content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      /*
       * Nested container query origin. cqi units inside .word resolve
       * against .content's inline size — which is the actual usable
       * width after .panel's padding. Without this, cqi would measure
       * the host width and long words could still overflow the padded
       * inner area. The outer :host container-type stays in place so
       * existing layout queries (@container (min-width: 360px) ...)
       * still target the host.
       */
      container-type: inline-size;
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
      gap: 0.4em 0.6em;
      align-items: baseline;
      line-height: 1.15;
      min-height: 2.5em;
      min-width: 0;
      color: var(--_ink);
    }

    /*
     * Continuous level scaling for the word-cloud effect. --_level is set
     * inline per-word and clamped into [1, 3]. Each level is a fixed
     * percentage of the content's inline size (3.3cqi per level → level
     * 3 is ~10% of inline width), so the longest vocab word
     * ("compassionate") fits at every container width. max() floor
     * keeps tiny containers from collapsing to unreadable.
     *
     * --_count-scale (set inline on .words) bumps font-size when only a
     * few labels are present — a lone "grateful" reads as a statement,
     * not an afterthought. Default 1.0 (5+ labels = normal). Computed
     * in render(): max(1, 1.3 - (n-1) * 0.075).
     *
     * --_word-color drives both the text color and the highlighter
     * background. Color is alpha-modulated via color-mix (instead of
     * the host element's opacity) so the highlighter background can
     * stay at its own alpha independent of the text.
     */
    .word {
      --_lv: clamp(1, var(--_level, 1), 3);
      --_text-alpha: calc((0.6 + (var(--_lv) - 1) * 0.2) * 100%);
      font-size: max(
        calc(var(--_lv) * 0.5em * var(--_count-scale, 1)),
        calc(var(--_lv) * 3.3cqi * var(--_count-scale, 1))
      );
      font-family: inherit;
      letter-spacing: -0.01em;
      color: color-mix(in srgb, var(--_word-color, var(--_ink)) var(--_text-alpha), transparent);
      background: color-mix(in srgb, var(--_word-color, var(--_ink)) 11%, transparent);
      padding: 0.05em 0.28em;
      border-radius: 0.2em;
      overflow-wrap: break-word;
    }
    /* Words mode: each label picks up its own V/A color from the lexicon.
       --_word-color is set inline per-word — render() picks the raw
       brand color on light, lighterForChips on dark. Higher text-alpha
       floor so light-V/A words stay legible. */
    :host([color-mode="words"]) .word {
      --_text-alpha: calc((0.78 + (var(--_lv) - 1) * 0.11) * 100%);
    }
    /* Background mode: pill uses the *paper* tone (not the panel color)
       so each word reads like a sticky-note on top of the V/A wash. */
    :host([color-mode="background"]) .word {
      background: color-mix(in srgb, var(--_paper) 55%, transparent);
    }

    .align-center .words { justify-content: center; }
    .align-right  .words { justify-content: flex-end; }

    .vad {
      display: flex;
      gap: 1.4em;
      margin-top: 1.6em;
      padding-top: 1em;
      border-top: 1px solid color-mix(in srgb, var(--_ink) 6%, transparent);
      font-family: inherit;
      font-size: 0.625em;
      color: color-mix(in srgb, var(--_ink) 50%, transparent);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .align-center .vad { justify-content: center; }
    .align-right  .vad { justify-content: flex-end; }

    /*
     * Layout flow is driven by CSS custom properties so a parent widget
     * (e.g. affect-kit-compare) can override the direction via container
     * queries — custom properties pierce the shadow DOM. Standalone, the
     * widget's own container query at 360px sets sensible defaults.
     *
     * --_face-dir   : flex-direction for the .content row
     * --_face-align : align-items
     * --_face-gap   : gap between face and words
     * --_face-step  : value for --_level-step (word size growth per level)
     * --_face-mb    : face-zone margin-bottom
     * --_face-mt    : face-zone margin-top
     *
     * Each var() call has a fallback that reflects the standalone default
     * for the current rule, so a parent only needs to override the values
     * it cares about.
     */

    /*
     * face-only: when showLabels is off (or no labels were provided),
     * the face is the only content item. Force column flow with the
     * face horizontally centered, regardless of row/column rules below
     * — there's no second item to lay out beside it.
     */
    .content.has-face.face-only {
      flex-direction: column !important;
      align-items: center;
      justify-content: center;
    }

    /* Standalone narrow defaults — face on top, vertical stack. */
    .content.has-face {
      flex-direction: var(--_face-dir, column);
      align-items: var(--_face-align, stretch);
      gap: var(--_face-gap, 0);
      --_level-step: var(--_face-step, 0.75em);
    }
    .content.has-face .face-zone {
      margin-top: var(--_face-mt, 0);
      margin-bottom: var(--_face-mb, 0.5em);
    }

    /* Standalone wide (host >= 360px) — face left, words right. */
    @container (min-width: 360px) {
      .content.has-face {
        flex-direction: var(--_face-dir, row);
        align-items: var(--_face-align, center);
        gap: var(--_face-gap, 2em);
        --_level-step: var(--_face-step, 0.5em);
      }
      .content.has-face .face-zone {
        margin-top: var(--_face-mt, 0);
        margin-bottom: var(--_face-mb, 0);
      }
      .content.has-face .words { flex: 1 1 auto; min-width: 0; }
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

  /**
   * Whether and how V/A color is applied. See {@link ColorMode}.
   * - `'background'` — tints the panel by the face V/A (legacy default
   *   when the attribute is present with no value).
   * - `'words'` — each emotion word picks up its own V/A color from
   *   the NRC lexicon. Background stays neutral.
   * - `null` — no color anywhere.
   */
  @property({ converter: colorModeConverter, attribute: 'color-mode', reflect: true })
  colorMode: ColorMode | null = null;

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
   *
   * A parent widget can also drive layout from the outside via the
   * `--_face-dir` / `--_face-align` / `--_face-gap` / `--_face-step` /
   * `--_face-mb` / `--_face-mt` custom properties, and suppress panel
   * chrome via `--_panel-bg` / `--_panel-padding` / `--_panel-shadow` /
   * `--_panel-radius` / `--_panel-overflow` / `--_glow-display`.
   */
  @property({ converter: animateConverter, reflect: true })
  animated = true;

  /**
   * Surface theme. See {@link Theme}.
   * - `'light'` (default) — dark ink on white paper.
   * - `'dark'` — white ink on dark paper; words-mode picks lighter V/A
   *   color variants so each label stays legible against the dark surface.
   * - `'auto'` — follow `prefers-color-scheme`.
   *
   * Orthogonal to {@link ColorMode}.
   */
  @property({ converter: themeConverter, reflect: true })
  theme: Theme = 'light';

  override render() {
    const r = this.rating;
    if (!r) return nothing;

    // Face shape and color always follow the pre-verbal pad gesture, not the
    // label composite — the visual represents WHERE the user placed their
    // feeling, not what words they chose afterward.
    const padV = r.face.v;
    const padA = r.face.a;
    const [cr, cg, cb] = colorForVA(padV, padA);
    const glowOn = this.colorMode === 'background';
    const glowStyle = glowOn
      ? `background: rgb(${cr},${cg},${cb})`
      : '';

    const wordsVisible = this.showLabels && r.labels.length > 0;
    const faceOnly = this.showFace && !wordsVisible;

    return html`
      <div class="panel${this.variant === 'compact' ? ' compact' : ''}${this.showFace ? ' with-face' : ''}">
        <div
          class="glow${glowOn ? ' on' : ''}"
          style="${glowStyle}"
        ></div>
        <div class="content align-${this.align}${this.showFace ? ' has-face' : ''}${faceOnly ? ' face-only' : ''}">

          ${this.showFace ? html`
            <div class="face-zone">
              <affect-kit-face
                .v=${padV}
                .a=${padA}
                .animated=${this.animated}
              ></affect-kit-face>
            </div>
          ` : nothing}

          ${this.showLabels && r.labels.length > 0 ? (() => {
            // Bump font-size when few labels are present so a sparse rating
            // reads as a deliberate statement rather than floating fragments.
            // 1 label = 1.30x, 2 = 1.225x, 3 = 1.15x, 4 = 1.075x, 5+ = 1.0x.
            const countScale = Math.max(1, 1.3 - (r.labels.length - 1) * 0.075);
            return html`
            <div class="words" style="--_count-scale:${countScale.toFixed(3)}">
              ${[...r.labels].sort((a, b) => b.level - a.level).map(l => {
                const lv = Math.max(1, Math.min(3, l.level));
                // Weight ramps gently with intensity. The dominant signal is
                // size (continuous via --_level → quadratic font-size); weight
                // adds emphasis without competing.
                const weight = Math.round(400 + 100 * (lv - 1));
                // In 'words' mode each label picks up its own NRC V/A color,
                // adjusted to stay legible against the surface — darker on
                // light theme, lighter on dark theme. 'auto' picks based on
                // OS preference.
                let extraStyle = '';
                if (this.colorMode === 'words') {
                  const e = EMOTIONS_BY_NAME.get(l.name);
                  if (e) {
                    // Words mode = no V/A panel behind the text. On a light
                    // surface the raw brand color reads fine and stays
                    // vivid — no muting needed (muting is for figure/ground
                    // when color sits *under* text). On dark the dim hues
                    // (cobalt, deep teal) need a lift to stay legible against
                    // dark paper, so lighterForChips applies in dark theme.
                    const useDark =
                      this.theme === 'dark' ||
                      (this.theme === 'auto' &&
                        typeof matchMedia !== 'undefined' &&
                        matchMedia('(prefers-color-scheme: dark)').matches);
                    const [wr, wg, wb] = useDark
                      ? lighterForChips(colorForVA(e.v, e.a))
                      : colorForVA(e.v, e.a);
                    extraStyle = `;--_word-color: rgb(${wr},${wg},${wb})`;
                  }
                }
                return html`
                  <span
                    class="word"
                    style="--_level:${lv};font-weight:${weight}${extraStyle}"
                  >${l.name}</span>
                `;
              })}
            </div>
          `;
          })() : nothing}

          ${this.showVad ? (() => {
            // Resolved VAD: composite (when labels selected) ?? face fallback with d=0.
            const v = r.composite?.v ?? r.face.v;
            const a = r.composite?.a ?? r.face.a;
            const d = r.composite?.d ?? 0;
            return html`
              <div class="vad">
                <span>V ${v.toFixed(2)}</span>
                <span>A ${a.toFixed(2)}</span>
                <span>D ${d.toFixed(2)}</span>
              </div>
            `;
          })() : nothing}

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
