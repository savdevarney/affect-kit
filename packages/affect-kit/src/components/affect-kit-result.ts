import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { Rating } from '../core/types';

const animateConverter = {
  fromAttribute: (value: string | null): boolean => value !== 'false',
  toAttribute: (value: boolean): string | null => (value ? null : 'false'),
};

/**
 * `<affect-kit-result>` — display panel for a captured rating.
 *
 * ```html
 * <affect-kit-result></affect-kit-result>
 * <script type="module">
 *   document.querySelector('affect-kit-result').rating = capturedRating;
 * </script>
 * ```
 *
 * The `rating` prop is the whole `Rating` object — pass it as one
 * cohesive value, don't split it into separate props.
 */
@customElement('affect-kit-result')
export class AffectKitResult extends LitElement {
  static override styles = css`
    :host { display: block; container-type: inline-size; }
  `;

  /** The captured rating to display. Required for any visible content. */
  @property({ attribute: false })
  rating: Rating | null = null;

  /** Render the face glyph alongside labels. */
  @property({ type: Boolean, attribute: 'show-face' })
  showFace = false;

  /** Render the selected emotion words. */
  @property({ type: Boolean, attribute: 'show-labels' })
  showLabels = true;

  /** Apply colored surface tint matching the rating's V/A position. */
  @property({ type: Boolean, attribute: 'show-color' })
  showColor = false;

  /** Debug-only VAD readout. */
  @property({ type: Boolean, attribute: 'show-vad' })
  showVad = false;

  /** Word alignment within the panel. */
  @property({ type: String })
  align: 'left' | 'center' | 'right' = 'center';

  /** Sizing preset. */
  @property({ type: String })
  variant: 'default' | 'compact' = 'default';

  /**
   * Breath animation on the face. Defaults true — same as the rater,
   * so a captured rating's face conveys arousal as motion. No tremor
   * in the result panel even at high arousal.
   */
  @property({ converter: animateConverter, reflect: true })
  animated = true;

  override render() {
    return html`<div><!-- TODO --></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affect-kit-result': AffectKitResult;
  }
}
