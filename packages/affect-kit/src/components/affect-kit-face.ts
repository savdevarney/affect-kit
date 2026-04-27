import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

// Custom converter: HTML attribute "false" → false; everything else → true.
// Lets us default `animate` to true while still supporting <el animate="false">.
const animateConverter = {
  fromAttribute: (value: string | null): boolean => value !== 'false',
  toAttribute: (value: boolean): string | null => (value ? null : 'false'),
};

/**
 * `<affect-kit-face>` — face glyph driven by valence and arousal.
 *
 * Minimal usage:
 * ```html
 * <affect-kit-face></affect-kit-face>
 * <affect-kit-face v="0.5" a="0.3"></affect-kit-face>
 * ```
 *
 * Defaults: v=0, a=0, animate=true. Animation respects
 * `prefers-reduced-motion: reduce` automatically.
 */
@customElement('affect-kit-face')
export class AffectKitFace extends LitElement {
  static override styles = css`
    :host { display: inline-block; line-height: 0; }
    svg   { width: 100%; height: 100%; }
  `;

  /** Valence ∈ [-1, 1]. Out-of-range values are clamped silently. */
  @property({ type: Number })
  v = 0;

  /** Arousal ∈ [-1, 1]. Out-of-range values are clamped silently. */
  @property({ type: Number })
  a = 0;

  /**
   * Breath + tremor animation. Defaults true.
   * Set `animate="false"` to render a static face. Reduced-motion users
   * see a static face regardless.
   */
  @property({ converter: animateConverter, reflect: true })
  animate = true;

  override render() {
    return html`<svg viewBox="-85 -85 170 170" aria-hidden="true"><!-- TODO --></svg>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affect-kit-face': AffectKitFace;
  }
}
