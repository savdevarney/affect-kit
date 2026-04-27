import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { Rating } from '../core/types';

/**
 * `<affect-kit-rater>` — interactive V/A pad with optional emotion-label
 * refinement. Emits `change` as `CustomEvent<Rating>` on every commit.
 *
 * ```html
 * <affect-kit-rater></affect-kit-rater>
 * <script type="module">
 *   document.querySelector('affect-kit-rater')
 *     .addEventListener('change', (e) => console.log(e.detail));
 * </script>
 * ```
 *
 * The rater always starts fresh. Use `rater.setRating(rating)` to prefill
 * a rating programmatically (rare).
 */
@customElement('affect-kit-rater')
export class AffectKitRater extends LitElement {
  static override styles = css`
    :host { display: block; }
  `;

  /** Solid colored surface vs monochrome paper. */
  @property({ type: Boolean, attribute: 'color-mode' })
  colorMode = false;

  /** Debug-only VAD readout below chips. */
  @property({ type: Boolean, attribute: 'show-vad' })
  showVad = false;

  /**
   * Programmatic prefill. Rare — most consumers should let the rater
   * start fresh and capture the user's `change` event.
   */
  setRating(_rating: Rating): void {
    // TODO
  }

  override render() {
    return html`<div><!-- TODO --></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affect-kit-rater': AffectKitRater;
  }

  interface HTMLElementEventMap {
    /**
     * Emitted on every commit (drag release, chip toggle).
     * `event.detail` is the canonical {@link Rating}.
     */
    change: CustomEvent<Rating>;
  }
}
