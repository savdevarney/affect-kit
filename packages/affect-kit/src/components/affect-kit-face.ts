import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  computeTarget,
  renderFace,
  smoothFaceParams,
  FACE_VIEWBOX,
  type FaceParams,
} from '../core/face-renderer';
import { computeAnimationOffsets } from '../core/animation';

// HTML attribute "false" → false; anything else (including absent) → true.
const animateConverter = {
  fromAttribute: (value: string | null): boolean => value !== 'false',
  toAttribute: (value: boolean): string | null => (value ? null : 'false'),
};

const SMOOTH_K = 0.11;
const SHOCK_DECAY = 0.93;

/**
 * `<affect-kit-face>` — animated face glyph driven by valence and arousal.
 *
 * ```html
 * <affect-kit-face v="0.5" a="0.3"></affect-kit-face>
 * <affect-kit-face v="-0.8" a="0.6" animated="false"></affect-kit-face>
 * ```
 *
 * Animation (breath, tremor, crows-feet) runs at 60 fps by default and
 * respects `prefers-reduced-motion: reduce` automatically.
 */
@customElement('affect-kit-face')
export class AffectKitFace extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
      width: 120px;
      height: 120px;
      line-height: 0;
    }
    svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .brow {
      fill: none;
      stroke: currentColor;
      stroke-width: 5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .eye {
      fill: none;
      stroke: currentColor;
      stroke-width: 4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .nose {
      fill: none;
      stroke: currentColor;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .mouth {
      fill: currentColor;
      stroke: none;
    }
    .crows-feet-line {
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
    }
  `;

  /** Valence ∈ [-1, 1]. Clamped silently if out of range. */
  @property({ type: Number }) v = 0;

  /** Arousal ∈ [-1, 1]. Clamped silently if out of range. */
  @property({ type: Number }) a = 0;

  /**
   * Breath + tremor animation. Defaults `true`.
   * Use `animated="false"` in HTML to opt out.
   * Reduced-motion users always get a static face regardless of this prop.
   */
  @property({ converter: animateConverter, reflect: true }) animated = true;

  private _current: FaceParams = computeTarget(0, 0);
  private _target: FaceParams = computeTarget(0, 0);
  private _shockEnergy = 0;
  private _t = 0;
  private _lastTs: number | null = null;
  private _rafId: number | null = null;
  private _mq: MediaQueryList | null = null;

  /**
   * Trigger a brief high-frequency shake — call when a high-arousal label is
   * toggled so the face reacts to the user's selection.
   */
  triggerShock(): void {
    this._shockEnergy = Math.min(1, this._shockEnergy + 0.6);
    this._ensureRaf();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof window !== 'undefined') {
      this._mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      this._mq.addEventListener('change', this._onMotionChange);
    }
    this._ensureRaf();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._mq?.removeEventListener('change', this._onMotionChange);
    this._stopRaf();
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.has('v') || changed.has('a')) {
      this._target = computeTarget(
        Math.max(-1, Math.min(1, this.v)),
        Math.max(-1, Math.min(1, this.a)),
      );
    }
    if (changed.has('animated')) {
      this._ensureRaf();
    }
  }

  private get _reducedMotion(): boolean {
    return this._mq?.matches ?? false;
  }

  private _onMotionChange = (): void => {
    this._ensureRaf();
  };

  private _ensureRaf(): void {
    const shouldAnimate = this.animated && !this._reducedMotion;
    if (shouldAnimate) {
      if (!this._rafId) {
        this._lastTs = null;
        this._rafId = requestAnimationFrame(this._tick);
      }
    } else {
      this._stopRaf();
      this._current = this._target;
      this.requestUpdate();
    }
  }

  private _stopRaf(): void {
    if (this._rafId != null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  private _tick = (ts: number): void => {
    const dt = this._lastTs != null ? (ts - this._lastTs) / 1000 : 0;
    this._lastTs = ts;
    this._t += dt;
    this._current = smoothFaceParams(this._current, this._target, SMOOTH_K);
    this._shockEnergy *= SHOCK_DECAY;
    this._rafId = requestAnimationFrame(this._tick);
    this.requestUpdate();
  };

  private _tr(f: { dx: number; dy: number }): string {
    if (f.dx === 0 && f.dy === 0) return '';
    return `translate(${f.dx.toFixed(2)},${f.dy.toFixed(2)})`;
  }

  override render() {
    const p = this._current;
    const paths = renderFace(p);
    const offsets = computeAnimationOffsets({
      t: this._t,
      v: this.v,
      a: this.a,
      motionScale: 1,
      shockEnergy: this._shockEnergy,
      reducedMotion: this._reducedMotion || !this.animated,
    });
    const { groupX, groupY, perFeature } = offsets;
    const crowsFeetOp = p.crowsFeetOp * offsets.crowsFeetOpacityScale;

    return html`
      <svg viewBox="${FACE_VIEWBOX}" aria-hidden="true">
        <g transform="translate(${groupX.toFixed(2)},${groupY.toFixed(2)})">
          <g transform="${this._tr(perFeature.leftBrow)}">
            <path class="brow" d="${paths.leftBrow}"></path>
          </g>
          <g transform="${this._tr(perFeature.rightBrow)}">
            <path class="brow" d="${paths.rightBrow}"></path>
          </g>
          <g transform="${this._tr(perFeature.leftEye)}">
            <path class="eye" d="${paths.leftEye}"></path>
          </g>
          <g transform="${this._tr(perFeature.rightEye)}">
            <path class="eye" d="${paths.rightEye}"></path>
          </g>
          <g style="opacity:${crowsFeetOp.toFixed(3)}">
            <path class="crows-feet-line" d="${paths.crowsFeetLeft}"></path>
            <path class="crows-feet-line" d="${paths.crowsFeetRight}"></path>
          </g>
          <g transform="${this._tr(perFeature.nose)}">
            <path class="nose" d="${paths.nose}"></path>
          </g>
          <g transform="${this._tr(perFeature.mouth)}">
            <path class="mouth" d="${paths.mouth}"></path>
          </g>
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
