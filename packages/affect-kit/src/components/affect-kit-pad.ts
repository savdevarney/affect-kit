import { LitElement, html, css, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { colorForVA } from '../core/color';
import { surfacePaletteRgb } from '../core/palette';
import { resolveTheme, themeConverter } from '../core/theme';
import type { PadGlow, Theme } from '../core/types';

const DWELL_MS = 500;

const animateConverter = {
  fromAttribute: (value: string | null): boolean => value !== 'false',
  toAttribute: (value: boolean): string | null => (value ? null : 'false'),
};

const glowConverter = {
  fromAttribute(value: string | null): PadGlow {
    if (value === 'neutral') return 'neutral';
    if (value === 'none') return 'none';
    return 'color';
  },
  toAttribute(value: PadGlow): string {
    return value;
  },
};

/** `event.detail` of the pad's `input` and `change` events. */
export interface PadPosition {
  /** Valence ∈ [-1, 1]. */
  v: number;
  /** Arousal ∈ [-1, 1]. */
  a: number;
}

/**
 * `<affect-kit-pad>` — the rater's face pad on its own: drag anywhere on it
 * to move the face through valence (x) and arousal (y). No chips, no button.
 * Use it when the app builds its own word list or form around the face.
 *
 * Emits `input` while dragging and `change` on release or after a pause,
 * both as `CustomEvent<{ v, a }>`, like a native range input. Build a
 * rating from the position with `createRating({ face: { v, a } })`.
 *
 * ```html
 * <affect-kit-pad theme="dark" glow="neutral"></affect-kit-pad>
 * <script type="module">
 *   document.querySelector('affect-kit-pad')
 *     .addEventListener('change', e => console.log(e.detail)); // { v, a }
 * </script>
 * ```
 */
export class AffectKitPad extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: relative;
      aspect-ratio: 1;
      cursor: grab;
      touch-action: none;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      --_ink: #1a1a1a;
    }
    :host(:active) { cursor: grabbing; }
    :host([theme="dark"]) { --_ink: white; }
    @media (prefers-color-scheme: dark) {
      :host([theme="auto"]) { --_ink: white; }
    }

    /* Soft halo behind the face, in the V/A color or (glow="neutral") the ink. */
    .glow {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: radial-gradient(closest-side, var(--_glow) 0%, transparent 100%);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.5s ease;
    }
    .glow.on { opacity: 1; }
    :host([glow="none"]) .glow { display: none; }

    affect-kit-face {
      position: absolute;
      inset: 0;
      margin: auto;
      width: 94%;
      height: 94%;
      pointer-events: none;
      filter: drop-shadow(0 10px 28px rgba(0,0,0,0.14));
    }

    .ghost-dot {
      position: absolute;
      width: 9px;
      height: 9px;
      background: var(--_dot);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .ghost-dot.visible { opacity: 1; }
  `;

  /** Valence ∈ [-1, 1]. Set it to place the face; dragging updates it. */
  @property({ type: Number }) v = 0;

  /** Arousal ∈ [-1, 1]. Set it to place the face; dragging updates it. */
  @property({ type: Number }) a = 0;

  /**
   * Breath + tremor animation. Defaults `true`.
   * Respects `prefers-reduced-motion: reduce` automatically.
   */
  @property({ converter: animateConverter, reflect: true })
  animated = true;

  /** Surface theme. See {@link Theme}. `'dark'` draws the face in white. */
  @property({ converter: themeConverter, reflect: true })
  theme: Theme = 'light';

  /**
   * The halo behind the face and the dot under the finger. See {@link PadGlow}.
   * - `'color'` (default) — both take the V/A color.
   * - `'neutral'` — both take the ink: white on `theme="dark"`.
   * - `'none'` — no halo; the dot stays, in the ink.
   */
  @property({ converter: glowConverter, reflect: true })
  glow: PadGlow = 'color';

  @state() private _dragging = false;
  @state() private _placed = false;

  private _dwellTimer: ReturnType<typeof setTimeout> | null = null;

  /** Put the face back in the center and hide the halo and dot. */
  reset(): void {
    this.v = 0;
    this.a = 0;
    this._placed = false;
  }

  // ── Pointer handling ──────────────────────────────────────────────────────

  private _onPointerDown(e: PointerEvent) {
    this.setPointerCapture(e.pointerId);
    this._dragging = true;
    this._placed = true;
    this._moveTo(e);
  }

  private _onPointerMove(e: PointerEvent) {
    if (!this._dragging) return;
    this._moveTo(e);
    // A pause mid-drag counts as a choice, as in the rater.
    if (this._dwellTimer != null) clearTimeout(this._dwellTimer);
    this._dwellTimer = setTimeout(() => this._emit('change'), DWELL_MS);
  }

  private _onPointerUp() {
    if (!this._dragging) return;
    this._dragging = false;
    this._clearDwell();
    this._emit('change');
  }

  private _onPointerCancel() {
    this._dragging = false;
    this._clearDwell();
  }

  private _clearDwell() {
    if (this._dwellTimer != null) { clearTimeout(this._dwellTimer); this._dwellTimer = null; }
  }

  private _moveTo(e: PointerEvent) {
    const rect = this.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    this.v = x * 2 - 1;
    this.a = 1 - y * 2;
    this._emit('input');
  }

  private _emit(type: 'input' | 'change') {
    this.dispatchEvent(new CustomEvent<PadPosition>(type, {
      detail: { v: this.v, a: this.a },
      bubbles: true,
      composed: true,
    }));
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('pointerdown', this._onPointerDown);
    this.addEventListener('pointermove', this._onPointerMove);
    this.addEventListener('pointerup', this._onPointerUp);
    this.addEventListener('pointercancel', this._onPointerCancel);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('pointerdown', this._onPointerDown);
    this.removeEventListener('pointermove', this._onPointerMove);
    this.removeEventListener('pointerup', this._onPointerUp);
    this.removeEventListener('pointercancel', this._onPointerCancel);
    this._clearDwell();
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // A position set from outside (a prefill) shows the halo and dot too.
    if ((changed.has('v') || changed.has('a')) && (this.v !== 0 || this.a !== 0)) {
      this._placed = true;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  override render() {
    let glowColor = 'color-mix(in srgb, var(--_ink) 18%, transparent)';
    let dotColor = 'color-mix(in srgb, var(--_ink) 35%, transparent)';
    if (this.glow === 'color') {
      const [r, g, b] = colorForVA(this.v, this.a);
      // The selected-chip color: it stands out against the V/A surface an app
      // paints behind the pad, where the raw color would vanish.
      const [dr, dg, db] = surfacePaletteRgb(this.v, this.a, resolveTheme(this.theme)).l3;
      glowColor = `rgb(${r}, ${g}, ${b})`;
      dotColor = `rgb(${dr}, ${dg}, ${db})`;
    }
    const x = (this.v + 1) / 2;
    const y = (1 - this.a) / 2;

    return html`
      <div
        class="glow${this._placed ? ' on' : ''}"
        style="--_glow: ${glowColor}"
      ></div>
      <affect-kit-face
        .v=${this.v}
        .a=${this.a}
        .animated=${this.animated}
        .motionScale=${this._dragging ? 0.2 : 1.0}
      ></affect-kit-face>
      <div
        class="ghost-dot${this._placed ? ' visible' : ''}"
        style="left:${(x * 100).toFixed(2)}%;top:${(y * 100).toFixed(2)}%;--_dot:${dotColor}"
      ></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affect-kit-pad': AffectKitPad;
  }
}
