import { LitElement, html, svg, css, nothing, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import {
  faceParams,
  facePaths,
  FACE_BOX,
  FACE_VIEWBOX,
  type FaceParams,
  type FacePart,
} from '../core/face-renderer';
import { FACE_STYLE, faceStroke, faceTier } from '../core/face-style';
import { vaColor } from '../core/pad';
import { decayShock, faceMotion, faceSettled, kickShock, smoothFaceParams } from '../core/motion';
import { themeConverter } from '../core/theme';
import type { Theme } from '../core/types';

// HTML attribute "false" → false; anything else (including absent) → true.
const animateConverter = {
  fromAttribute: (value: string | null): boolean => value !== 'false',
  toAttribute: (value: boolean): string | null => (value ? null : 'false'),
};

/**
 * `<affect-kit-face>` — animated face glyph driven by valence and arousal.
 *
 * ```html
 * <affect-kit-face v="0.5" a="0.3"></affect-kit-face>
 * <affect-kit-face v="-0.8" a="0.6" animated="false"></affect-kit-face>
 * ```
 *
 * The face eases to a new position and breathes, trembles and shakes by
 * elapsed time (affect-kit/core's motion), so it moves the same at any frame
 * rate. With `prefers-reduced-motion: reduce` it still eases, faster, and
 * holds still otherwise.
 */
export class AffectKitFace extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
      width: 120px;
      height: 120px;
      line-height: 0;
      /* Theme: --_ink is what currentColor resolves to. SVG strokes/fills
         below all use currentColor, so theme="dark" flips the face to
         white strokes without touching markup.
         No :host([theme="light"]) override — we deliberately *don't*
         redeclare --_ink for light theme so the property can inherit
         from a themed parent (rater/result/compare). The var() fallback
         catches the standalone "no parent" case. */
      color: var(--affect-kit-ink, var(--_ink, #1a1a1a));
    }
    :host([theme="dark"])  { --_ink: white; }
    @media (prefers-color-scheme: dark) {
      :host([theme="auto"]) { --_ink: white; }
    }
    svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    /* Strokes and fills come from FACE_STYLE (affect-kit/core), as attributes,
       so a native face draws the same. Everything takes currentColor. */
    path {
      stroke: currentColor;
    }
  `;

  /** Valence ∈ [-1, 1]. Clamped silently if out of range. */
  @property({ type: Number }) v = 0;

  /** Arousal ∈ [-1, 1]. Clamped silently if out of range. */
  @property({ type: Number }) a = 0;

  /**
   * Easing, breath and tremor. Defaults `true`. With `animated="false"` the
   * face jumps to each position and holds still. With the OS's Reduce Motion
   * the face eases, faster, and holds still.
   */
  @property({ converter: animateConverter, reflect: true }) animated = true;

  /**
   * Surface theme. See {@link Theme}. `'dark'` flips the strokes to white.
   * `'auto'` follows `prefers-color-scheme`.
   */
  @property({ converter: themeConverter, reflect: true })
  theme: Theme = 'light';

  /**
   * Scales all animation amplitude (breath + tremor). Range 0..1, default 1.
   * The rater sets this to ~0.2 while the user is actively dragging so the
   * face stays readable during interaction, then restores it to 1.0 on release.
   *
   * @internal
   */
  @property({ type: Number, attribute: false }) motionScale = 1;

  private _current: FaceParams = faceParams(0, 0);
  private _target: FaceParams = faceParams(0, 0);

  /** The face's drawn width, which picks its tier (FACE_TIERS). Full until measured. */
  @state() private _sizePx = Infinity;
  private _resize: ResizeObserver | null = null;
  private _shock = 0;
  private _t = 0;
  private _lastTs: number | null = null;
  private _rafId: number | null = null;
  private _mq: MediaQueryList | null = null;

  /**
   * Trigger a brief high-frequency shake — call when a high-arousal label is
   * toggled so the face reacts to the user's selection.
   */
  triggerShock(): void {
    if (this._reducedMotion || !this.animated) return; // the shock is motion: Reduce Motion stops it
    this._shock = kickShock(this._shock);
    this._ensureRaf();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof window !== 'undefined') {
      this._mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      this._mq.addEventListener('change', this._onMotionChange);
    }
    if (typeof ResizeObserver !== 'undefined') {
      this._resize = new ResizeObserver(entries => {
        const width = entries[0]?.contentRect.width;
        if (width) this._sizePx = width;
      });
      this._resize.observe(this);
    }
    this._ensureRaf();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._mq?.removeEventListener('change', this._onMotionChange);
    this._resize?.disconnect();
    this._resize = null;
    this._stopRaf();
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.has('v') || changed.has('a')) {
      this._target = faceParams(this.v, this.a);
      this._ensureRaf();
    } else if (changed.has('animated')) {
      this._ensureRaf();
    }
  }

  private get _reducedMotion(): boolean {
    return this._mq?.matches ?? false;
  }

  private _onMotionChange = (): void => {
    this._ensureRaf();
  };

  // Animated: a frame loop runs. Under Reduce Motion it runs only until the
  // face settles. Not animated: the face jumps and no loop runs.
  private _ensureRaf(): void {
    if (!this.animated) {
      this._stopRaf();
      this._current = this._target;
      this.requestUpdate();
      return;
    }
    if (this._reducedMotion && faceSettled(this._current, this._target)) return;
    if (!this._rafId) {
      this._lastTs = null;
      this._rafId = requestAnimationFrame(this._tick);
    }
  }

  private _stopRaf(): void {
    if (this._rafId != null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  private _tick = (ts: number): void => {
    const dtMs = this._lastTs != null ? ts - this._lastTs : 0;
    this._lastTs = ts;
    this._t += dtMs / 1000;
    const reducedMotion = this._reducedMotion;
    this._current = smoothFaceParams(this._current, this._target, dtMs, { reducedMotion });
    this._shock = decayShock(this._shock, dtMs);
    this.requestUpdate();
    if (reducedMotion && faceSettled(this._current, this._target)) {
      this._rafId = null;
      return;
    }
    this._rafId = requestAnimationFrame(this._tick);
  };

  private _tr(f: { x: number; y: number }): string {
    if (f.x === 0 && f.y === 0) return '';
    return `translate(${f.x.toFixed(2)},${f.y.toFixed(2)})`;
  }

  override render() {
    const tier = faceTier(this._sizePx);
    if (tier.draw === 'dot') {
      return html`
        <svg viewBox="${FACE_VIEWBOX}" aria-hidden="true">
          <circle cx="0" cy="0" r="${FACE_BOX.width / 2}" fill="${vaColor(this.v, this.a)}"></circle>
        </svg>
      `;
    }
    const p = this._current;
    const paths = facePaths(p);
    const widths = faceStroke(this._sizePx);
    const offsets = faceMotion(this._t, this.v, this.a, {
      motionScale: this.motionScale,
      shock: this._shock,
      reducedMotion: this._reducedMotion || !this.animated,
    });
    const parts = offsets.parts;
    const crowsFeetOp = p.crowsFeetOp;
    const shown = (part: FacePart) => !tier.omit.includes(part);
    const path = (part: FacePart) => {
      const style = FACE_STYLE[part];
      return svg`<path
        d="${paths[part]}"
        fill="${style.fill ? 'currentColor' : 'none'}"
        stroke-width="${widths[part]}"
        stroke-linecap="${style.lineCap}"
        stroke-linejoin="${style.lineJoin}"
      ></path>`;
    };

    return html`
      <svg viewBox="${FACE_VIEWBOX}" aria-hidden="true">
        <g transform="translate(${offsets.x.toFixed(2)},${offsets.y.toFixed(2)})">
          <g transform="${this._tr(parts.leftBrow)}">${path('leftBrow')}</g>
          <g transform="${this._tr(parts.rightBrow)}">${path('rightBrow')}</g>
          <g transform="${this._tr(parts.leftEye)}">${path('leftEye')}</g>
          <g transform="${this._tr(parts.rightEye)}">${path('rightEye')}</g>
          ${shown('crowsFeetLeft') ? svg`
            <g style="opacity:${crowsFeetOp.toFixed(3)}">
              ${path('crowsFeetLeft')}
              ${path('crowsFeetRight')}
            </g>` : nothing}
          ${shown('nose') ? svg`<g transform="${this._tr(parts.nose)}">${path('nose')}</g>` : nothing}
          <g transform="${this._tr(parts.mouth)}">${path('mouth')}</g>
        </g>
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affect-kit-face': AffectKitFace;
  }
}
