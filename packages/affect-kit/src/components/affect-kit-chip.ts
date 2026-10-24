import { LitElement, html, css, nothing, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { chipStyle, BASE_FONT_PX, type ChipColors, type ChipStyle } from '../core/chip';
import { A11Y_STRINGS_EN, chipA11y, type A11yStrings } from '../core/a11y';
import { RATER_TIMING, type Curve } from '../core/rater';

const curve = (c: Curve) => unsafeCSS(`${c.ms}ms cubic-bezier(${c.bezier.join(', ')})`);
import { neutralPalette } from '../core/palette';
import { resolveTheme, themeConverter } from '../core/theme';
import type { Theme } from '../core/types';

/**
 * `<affect-kit-chip>` — one emotion word as a pill, with 1-3 concentric rings
 * for intensity. Interactive by default (a button; clicks bubble, so the host
 * decides what a tap does); `readonly` makes it a plain label for result
 * screens. Colorless by default; pass `colors` to tint it.
 *
 * ```html
 * <affect-kit-chip label="grateful" level="2"></affect-kit-chip>
 * <affect-kit-chip label="grateful" level="2" readonly></affect-kit-chip>
 * ```
 *
 * ```ts
 * chip.colors = surfacePalette(v, a, 'light'); // or neutralPalette / wordChipColors
 * ```
 *
 * The look comes from `chipStyle()`, which `affect-kit/core` also exports, so
 * native views can draw the same chip.
 */
export class AffectKitChip extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
      font-family: inherit;
      -webkit-tap-highlight-color: transparent;
    }
    .chip {
      display: inline-block;
      box-sizing: border-box;
      font: inherit;
      /* The rings are an outward box-shadow stack; --_rings is set inline from chipStyle. */
      --_lift: 0 0 transparent;
      box-shadow: var(--_rings, 0 0 transparent), var(--_lift);
      transition:
        background ${curve(RATER_TIMING.chipColor)},
        color      ${curve(RATER_TIMING.chipColor)},
        box-shadow ${curve(RATER_TIMING.chipRings)};
      user-select: none;
    }
    /* Reduce Motion: the rings appear without growing. */
    @media (prefers-reduced-motion: reduce) {
      .chip {
        transition:
          background ${curve(RATER_TIMING.chipColor)},
          color      ${curve(RATER_TIMING.chipColor)};
      }
    }
    button.chip { cursor: pointer; }
    button.chip:hover { --_lift: 0 4px 12px rgba(0,0,0,0.16), 0 2px 4px rgba(0,0,0,0.10); }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `;

  /** The word shown. Not validated: pass a vocabulary label, or any text for a custom chip. */
  @property() label = '';

  /** 0 unselected; 1, 2, 3 selected, with that many rings. Rounded and clamped. */
  @property({ type: Number, reflect: true }) level = 0;

  /** A plain label, not a button: no hover, no focus. For result screens. */
  @property({ type: Boolean, reflect: true }) readonly = false;

  /**
   * Colors to draw with. Defaults to {@link neutralPalette}, with no hue. A
   * `surfacePalette()`, `neutralPalette()` or `wordChipColors()` result works.
   */
  @property({ attribute: false }) colors?: ChipColors;

  /** Picks the default colors and nothing else. See {@link Theme}. */
  @property({ converter: themeConverter, reflect: true })
  theme: Theme = 'light';

  /** What a screen reader hears for the level. English by default. */
  @property({ attribute: false }) strings: A11yStrings = A11Y_STRINGS_EN;

  /** The resolved look, for hosts that want to read it (rings, bleed). */
  get look(): ChipStyle {
    return chipStyle(this.level, this.colors ?? neutralPalette(resolveTheme(this.theme)));
  }

  override render() {
    const s = this.look;
    // Cumulative spread: each stroke sits outside the last. First-listed shadow is on top,
    // so the nearest stroke comes first.
    let spread = 0;
    const rings = s.rings.map(r => `0 0 0 ${(spread += r.width)}px ${r.color}`).join(', ');
    // chipStyle gives px at the base size; here they become em, so the chip
    // follows the page's text size. Padding is em of the chip's own text.
    const em = (n: number) => Number(n.toFixed(4));
    const style = [
      `padding:${em(s.paddingY / s.fontSize)}em ${em(s.paddingX / s.fontSize)}em`,
      `font-size:${em(s.fontSize / BASE_FONT_PX)}em`,
      `font-weight:${s.fontWeight}`,
      `border:${s.border.width}px solid ${s.border.color}`,
      `border-radius:${s.borderRadius}px`,
      `background:${s.background}`,
      `color:${s.color}`,
      rings ? `--_rings:${rings}` : '',
    ].filter(Boolean).join(';');
    // The visible word, then its level for screen readers: "anxious, strongly" (chipLabel's words).
    const intensity = s.level > 0
      ? html`<span class="sr-only">${this.strings.joiner}${this.strings.levels[s.level - 1]}</span>`
      : nothing;

    return this.readonly
      ? html`<span class="chip" style=${style}>${this.label}${intensity}</span>`
      : html`<button class="chip" type="button" aria-pressed=${chipA11y(this.label, s.level, this.strings).selected ? 'true' : 'false'} style=${style}>${this.label}${intensity}</button>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affect-kit-chip': AffectKitChip;
  }
}
