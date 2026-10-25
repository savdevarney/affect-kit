import { LitElement, html, css, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { colorForVA, surfaceIsLight, SURFACE_MIX, type Rgb } from '../core/color';
import { surfacePaletteRgb, surfacePalette, neutralPalette, wordChipColors } from '../core/palette';
import { WORD_LIST_GAP, type ChipColors } from '../core/chip';
import { colorModeConverter } from '../core/color-mode';
import { resolveTheme, themeConverter } from '../core/theme';
import { EMOTIONS } from '../vocabulary/en';
import { FACE_MOTION } from '../core/motion';
import { faceToPad, padColors, padToFace, vaColor } from '../core/pad';
import { A11Y_STRINGS_EN, FACE_STEPS, axisValueText, type A11yStrings, type FaceAxis } from '../core/a11y';
import {
  canFinish, createRater, raterRating, raterReducer, tapShocks,
  RATER_LAYOUT, RATER_TIMING, UNSET_FACE,
  type Curve, type RaterEvent, type RaterState,
} from '../core/rater';
import type { ColorMode, Rating, EmotionName, Theme } from '../core/types';
import type { AffectKitFace } from './affect-kit-face';

// A transition from RATER_TIMING, as CSS.
const curve = (c: Curve) => unsafeCSS(`${c.ms}ms cubic-bezier(${c.bezier.join(', ')})`);
const T = RATER_TIMING;

const animateConverter = {
  fromAttribute: (value: string | null): boolean => value !== 'false',
  toAttribute: (value: boolean): string | null => (value ? null : 'false'),
};

/**
 * `<affect-kit-rater>` — interactive V/A pad + emotion label chips.
 * Emits `change` as `CustomEvent<Rating>` on pointer release and chip
 * toggles (after the first placement).
 *
 * ```html
 * <affect-kit-rater></affect-kit-rater>
 * <script type="module">
 *   document.querySelector('affect-kit-rater')
 *     .addEventListener('change', e => console.log(e.detail));
 * </script>
 * ```
 */
export class AffectKitRater extends LitElement {
  static override styles = css`
    :host {
      display: block;
      container-type: inline-size;
      font-family: inherit;
      font-size: var(--affect-kit-font-size, 1rem);
      max-width: var(--affect-kit-rater-max-width, 640px);

      /* Theme: --_ink and --_paper are the polarity of the surface. Default
         light; flipped by [theme="dark"] below. Everything else in this
         stylesheet derives text/bg from these via color-mix.
         An app sets --affect-kit-paper and --affect-kit-ink to put the rater
         on its own page; they win in both themes, so give them the page's
         light and dark values (light-dark() does both in one). */
      --_ink:   var(--affect-kit-ink, #1a1a1a);
      --_paper: var(--affect-kit-paper, white);

      /* V/A-driven (set by _updateColorVars at runtime; defaults are neutral). */
      --_l3-r: 80; --_l3-g: 80; --_l3-b: 80;
      --_surface-is-light: 0;
    }
    :host([theme="dark"]) {
      --_ink:   var(--affect-kit-ink, white);
      --_paper: var(--affect-kit-paper, #1a1a1a);
    }
    @media (prefers-color-scheme: dark) {
      :host([theme="auto"]) {
        --_ink:   var(--affect-kit-ink, white);
        --_paper: var(--affect-kit-paper, #1a1a1a);
      }
    }

    .surface {
      position: relative;
      background: var(--_paper);
      border-radius: 24px;
      overflow: hidden;
      box-shadow:
        0 1px 2px color-mix(in srgb, var(--_ink) 4%, transparent),
        0 8px 24px color-mix(in srgb, var(--_ink) 4%, transparent);
      display: flex;
      flex-direction: column;
    }
    /* color-mode off → composable surface. No paper, no card shadow, so
       the rater drops onto whatever the host's background is. */
    :host(:not([color-mode])) .surface {
      background: transparent;
      box-shadow: none;
    }

    .glow {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0;
      z-index: 0;
      transition: opacity ${curve(T.halo)}, background 50ms linear;
    }
    /* Same ratio surfacePalette() blends at, so apps can match this surface. */
    .glow.on { opacity: ${unsafeCSS(SURFACE_MIX)}; }

    /* ── Face pad ─────────────────────────────────────────── */
    .face-zone {
      position: relative;
      flex: 0 0 auto;
      width: 100%;
      max-width: ${unsafeCSS(RATER_LAYOUT.faceMax)}px;
      aspect-ratio: 1;
      margin: 4px auto 0;
      cursor: grab;
      touch-action: none;
      user-select: none;
      z-index: 1;
    }
    .face-zone:active { cursor: grabbing; }

    affect-kit-face {
      position: absolute;
      inset: 0;
      margin: auto;
      width: ${unsafeCSS(RATER_LAYOUT.faceInset * 100)}%;
      height: ${unsafeCSS(RATER_LAYOUT.faceInset * 100)}%;
      pointer-events: none;
      /* An app that wants the bare glyph sets --affect-kit-face-shadow: none. */
      filter: var(--affect-kit-face-shadow, drop-shadow(0 ${unsafeCSS(RATER_LAYOUT.faceShadow.y)}px ${unsafeCSS(RATER_LAYOUT.faceShadow.blur)}px rgba(0,0,0,${unsafeCSS(RATER_LAYOUT.faceShadow.opacity)})));
      transition: opacity ${curve(T.inkIn)};
    }
    /* Before the first touch: the face at the centre in faded ink, with no
       breath, glow or color. The first move inks it in. */
    .face-zone.unset affect-kit-face { opacity: ${unsafeCSS(UNSET_FACE.inkOpacity)}; }

    .ghost-dot {
      position: absolute;
      width: ${unsafeCSS(RATER_LAYOUT.dotSize)}px;
      height: ${unsafeCSS(RATER_LAYOUT.dotSize)}px;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      opacity: 0;
      transition: opacity ${curve(T.dot)};
    }

    /* The face as two adjustable values, for screen readers and the keyboard
       (affect-kit/core's FACE_STEPS). Hidden, but focus shows on the pad. */
    .adjust {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: 0;
      opacity: 0;
      pointer-events: none;
    }
    .face-zone:has(.adjust:focus-visible) {
      outline: 2px solid var(--_ink);
      outline-offset: 4px;
      border-radius: 50%;
    }

    /* Straight to the words, leaving the face unset: hidden until focused. */
    .to-words {
      align-self: center;
      margin: 6px auto 0;
      font: inherit;
      font-size: 0.75em;
      color: var(--_ink);
      background: var(--_paper);
      border: 1.5px solid var(--_ink);
      border-radius: 0.88em;
      padding: 0.4em 0.9em;
      z-index: 1;
    }
    .to-words:not(:focus-visible) {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
      padding: 0;
      border: 0;
    }
    .ghost-dot.visible { opacity: 1; }

    /* ── Chips ────────────────────────────────────────────── */
    .chips-zone {
      flex: 1 1 auto;
      padding: 4px 22px 14px;
      z-index: 1;
      min-height: 380px;
      overflow: hidden;
      transition:
        opacity ${curve(T.revealFade)},
        filter  ${curve(T.revealFade)},
        transform ${curve(T.reveal)},
        max-height 0.7s cubic-bezier(0.4, 0, 0.2, 1),
        min-height 0.7s cubic-bezier(0.4, 0, 0.2, 1),
        padding   0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .chips-zone.empty {
      opacity: 0;
      filter: blur(${unsafeCSS(RATER_LAYOUT.revealBlur)}px);
      pointer-events: none;
      transform: translateY(${unsafeCSS(RATER_LAYOUT.revealRise)}px);
      max-height: 0;
      min-height: 0;
      padding-top: 0;
      padding-bottom: 0;
    }

    .chip-list {
      display: flex;
      flex-wrap: wrap;
      /* WORD_LIST_GAP clears two level-3 chips side by side: their
         outward rings reach 7.5px each, 15px together. */
      gap: ${unsafeCSS(WORD_LIST_GAP.row)}px ${unsafeCSS(WORD_LIST_GAP.column)}px;
      align-items: center;
      justify-content: center;
    }

    .vad-readout {
      margin-top: 1.1em;
      padding-top: 0.88em;
      border-top: 1px solid color-mix(in srgb, var(--_ink) 6%, transparent);
      font-family: inherit;
      font-size: 0.625em;
      color: color-mix(in srgb, var(--_ink) 50%, transparent);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    /* ── Chip header (hint + submit, stacked, crossfade in place) ── */
    .chip-header {
      display: grid;
      grid-template-areas: "stack";
      min-height: 2.6em;
      margin-bottom: 0.75em;
      transition: opacity ${curve(T.header)}, min-height ${curve(T.header)}, margin ${curve(T.header)};
    }
    /* With the app's own button (hide-submit), nothing is left in the row once the hint fades, so the
       row folds away and the words sit up under the face. */
    .chip-header.folded {
      min-height: 0;
      margin-bottom: 0;
    }
    .chip-header.folded .chips-hint { display: none; }
    .chip-header > * { grid-area: stack; }
    .chip-header.dragging {
      opacity: 0;
      pointer-events: none;
    }

    /* ── Prompt hint ──────────────────────────────────────── */
    .chips-hint {
      align-self: center;
      margin: 0;
      font-family: inherit;
      font-size: 0.69em;
      color: color-mix(in srgb, var(--_ink) 35%, transparent);
      text-align: center;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      pointer-events: none;
      transition: opacity 0.25s ease;
    }
    .chips-hint.gone {
      opacity: 0;
    }

    /* ── Submit button ──────────────────────────────────────
       Default: outline style — sits quietly against plain surfaces
       (color-mode=null / "words"). Fills with ink on hover.
       color-mode="background": filled style — the V/A wash beneath
       would swallow an outline, so the button takes the V/A color
       directly to stand against the background. */
    .submit-btn {
      align-self: stretch;
      margin: 0;
      display: block;
      width: 100%;
      padding: 0.59em 1em;
      background: transparent;
      color: var(--_ink);
      border: 1.5px solid var(--_ink);
      border-radius: 0.88em;
      font-family: inherit;
      font-size: 0.81em;
      font-weight: 600;
      letter-spacing: 0.01em;
      cursor: pointer;
      opacity: 0;
      transition:
        opacity    0.3s ease,
        background 0.15s ease,
        color      0.15s ease,
        border-color 0.15s ease;
      pointer-events: none;
    }
    .submit-btn.visible {
      opacity: 1;
      pointer-events: auto;
    }
    .submit-btn:hover {
      background: var(--_ink);
      color: var(--_paper);
    }
    .submit-btn:active { transform: scale(0.98); }

    :host([color-mode="background"]) .submit-btn {
      background: rgba(var(--_l3-r), var(--_l3-g), var(--_l3-b), 1);
      color: var(--_text-l3, rgba(0,0,0,0.95));
      border-color: transparent;
    }
    :host([color-mode="background"]) .submit-btn:hover {
      background: rgba(var(--_l3-r), var(--_l3-g), var(--_l3-b), 0.82);
    }

    /* Reduce Motion: fades stay; travel and blur go. */
    @media (prefers-reduced-motion: reduce) {
      .chips-zone { transition: opacity ${curve(T.reduced.reveal)}; }
      .chips-zone.empty { filter: none; transform: none; }
    }

    /* Wide layout: face left, chips right */
    @container (min-width: ${unsafeCSS(RATER_LAYOUT.wideAt)}px) {
      .surface {
        flex-direction: row;
        align-items: stretch;
        min-height: 360px;
      }
      .surface:has(.chips-zone.empty) { min-height: 0; }
      .face-zone {
        flex: 0 0 auto;
        width: ${unsafeCSS(RATER_LAYOUT.faceMaxWide)}px;
        max-width: ${unsafeCSS(RATER_LAYOUT.faceMaxWide)}px;
        margin: 10px 0 10px 24px;
        align-self: center;
      }
      .surface:has(.chips-zone.empty) .face-zone { margin: 10px auto; }
      .chips-zone {
        padding: 16px 28px 16px 12px;
        min-height: auto;
        flex: 1 1 auto;
        min-width: 0;
      }
      .chips-zone.empty { flex: 0 0 0; padding: 0; }
    }
  `;

  /**
   * Color treatment. See {@link ColorMode}.
   * - `'background'` — surface tints with the pad's V/A (legacy default
   *   when the attribute is present with no value).
   * - `'words'` — surface stays neutral; each chip carries its own lexicon
   *   color, so the picker reads as a constellation.
   * - `null` — fully monochrome.
   */
  @property({ converter: colorModeConverter, attribute: 'color-mode', reflect: true })
  colorMode: ColorMode | null = null;

  /**
   * Breath + tremor animation. Defaults `true`.
   * Respects `prefers-reduced-motion: reduce` automatically.
   */
  @property({ converter: animateConverter, reflect: true })
  animated = true;

  /** Debug VAD readout below chips. */
  @property({ type: Boolean, attribute: 'show-vad' })
  showVad = false;

  /** Label for the submit button. Override via the `submit-label` attribute. */
  @property({ attribute: 'submit-label' })
  submitLabel = 'Done';

  /**
   * Hide the submit button, for an app whose own screen has the button that
   * moves on (Next, Save). `change` still fires on every edit; an app can
   * enable its button when `rating.labels.length > 0`, as `canFinish` does.
   */
  @property({ type: Boolean, attribute: 'hide-submit' })
  hideSubmit = false;

  /**
   * The line above the chips until a word is chosen. An empty string hides it, for an app that
   * writes its own. Style it from outside with `affect-kit-rater::part(hint)`.
   */
  @property({ attribute: 'chips-hint' })
  chipsHint = 'name what you feel';

  /**
   * Surface theme. See {@link Theme}.
   * - `'light'` (default) — dark ink on white paper.
   * - `'dark'` — white ink on dark paper. Chip backgrounds invert.
   * - `'auto'` — follow `prefers-color-scheme`.
   *
   * Orthogonal to {@link ColorMode}.
   */
  @property({ converter: themeConverter, reflect: true })
  theme: Theme = 'light';

  /** What a screen reader hears. English by default; pass your own words. */
  @property({ attribute: false }) strings: A11yStrings = A11Y_STRINGS_EN;

  /** The rater's state. affect-kit/core's raterReducer runs it, as it would a native rater. */
  @state() private _state: RaterState = createRater();

  @query('#face-el') private _faceEl?: AffectKitFace;
  @query('.chip-list') private _chipList?: HTMLElement;

  private _dwellTimer: ReturnType<typeof setTimeout> | null = null;
  private _motionQuery?: MediaQueryList;

  /** Open a saved rating to change it: the face where it was, its words chosen. */
  setRating(rating: Rating): void {
    this._dispatch({ type: 'load', rating });
  }

  /** Back to the start: no face, no words. */
  reset(): void {
    this._clearDwell();
    this._dispatch({ type: 'reset' });
  }

  private get _reducedMotion(): boolean {
    return this._motionQuery?.matches ?? false;
  }

  // ── Every change goes through the reducer ────────────────────────────────

  private _dispatch(event: RaterEvent): RaterState {
    const prev = this._state;
    const next = raterReducer(prev, event);
    if (next === prev) return prev;
    if (tapShocks(prev, next)) this._faceEl?.triggerShock();
    // The words show for the first time: by the face settling, or "Choose words without the face".
    if (!prev.revealed && next.revealed) this.dispatchEvent(new CustomEvent('reveal', { bubbles: true, composed: true }));
    // The first sort is silent: the words are still fading in.
    if (prev.revealed && next.order !== prev.order) void this._reorder(next);
    else this._state = next;
    this._updateColorVars();
    return next;
  }

  // ── Pointer: the renderer owns the finger and the dwell timer ────────────

  private _onPointerDown(e: PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this._moveTo(e);
  }

  private _onPointerMove(e: PointerEvent) {
    if (!this._state.dragging) return;
    this._moveTo(e);
    // A pause mid-drag counts as a choice.
    this._clearDwell();
    this._dwellTimer = setTimeout(() => this._settle(), RATER_TIMING.dwellMs);
  }

  private _onPointerUp() {
    if (!this._state.dragging) return;
    this._clearDwell();
    this._settle();
  }

  // A cancelled drag (the browser took the gesture) leaves the face where it was.
  private _onPointerCancel() {
    this._clearDwell();
    if (this._state.dragging) this._settle();
  }

  private _clearDwell() {
    if (this._dwellTimer != null) { clearTimeout(this._dwellTimer); this._dwellTimer = null; }
  }

  private _moveTo(e: PointerEvent) {
    const zone = this.shadowRoot!.querySelector<HTMLElement>('.face-zone')!;
    const rect = zone.getBoundingClientRect();
    const { v, a } = padToFace((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
    this._dispatch({ type: 'move', v, a });
  }

  private _settle() {
    this._dispatch({ type: 'settle' });
    this._emitChange();
  }

  // ── Screen readers and the keyboard ──────────────────────────────────────

  // The adjustable value moved to a stop: step the face there, one stop at a time.
  private _adjustTo(axis: FaceAxis, target: number) {
    for (let i = 0; i < FACE_STEPS.length; i++) {
      const face = this._state.face;
      const current = face ? (axis === 'pleasant' ? face.v : face.a) : null;
      if (current !== null && Math.abs(current - target) < 1e-6) break;
      const up = current === null ? target >= 0 : target > current;
      this._dispatch({ type: 'adjust', axis, direction: up ? 1 : -1 });
    }
    this._emitChange();
  }

  private _onAdjust(axis: FaceAxis, e: Event) {
    const step = FACE_STEPS[Number((e.currentTarget as HTMLInputElement).value)];
    if (step !== undefined) this._adjustTo(axis, step);
  }

  private _showWords() {
    this._dispatch({ type: 'showWords' });
  }

  // ── Words ────────────────────────────────────────────────────────────────

  private _tap(name: EmotionName) {
    const prev = this._state;
    if (this._dispatch({ type: 'tap', name }) !== prev) this._emitChange();
  }

  // The words slide to their new order together (RATER_TIMING.reorder). Under
  // Reduce Motion the list crossfades instead, with no travel.
  private async _reorder(next: RaterState) {
    const chips = [...(this.shadowRoot?.querySelectorAll<HTMLElement>('affect-kit-chip') ?? [])];
    if (this._reducedMotion) {
      const list = this._chipList;
      if (list) { list.style.transition = 'none'; list.style.opacity = '0'; }
      this._state = next;
      await this.updateComplete;
      if (!list) return;
      requestAnimationFrame(() => {
        list.style.transition = `opacity ${curve(RATER_TIMING.reduced.reorder)}`;
        list.style.opacity = '';
      });
      return;
    }
    const before = new Map(chips.map(el => [el.dataset['name']!, el.getBoundingClientRect()]));
    this._state = next;
    await this.updateComplete;
    for (const el of chips) {
      const from = before.get(el.dataset['name']!);
      if (!from) continue;
      const to = el.getBoundingClientRect();
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    }
    requestAnimationFrame(() => {
      for (const el of chips) {
        if (!el.style.transform) continue;
        el.style.transition = `transform ${curve(RATER_TIMING.reorder)}`;
        el.style.transform = '';
      }
    });
  }

  // ── Color vars ───────────────────────────────────────────────────────────

  private _updateColorVars() {
    // surfacePalette's math, so an app painting a screen with surfacePalette()
    // gets the same surface, chips and text as this rater.
    const face = this._state.face ?? UNSET_FACE;
    const p = surfacePaletteRgb(face.v, face.a, resolveTheme(this.theme));
    const css = (c: Rgb) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    this.style.setProperty('--_l3-r', String(p.l3[0]));
    this.style.setProperty('--_l3-g', String(p.l3[1]));
    this.style.setProperty('--_l3-b', String(p.l3[2]));
    this.style.setProperty('--_surface-is-light', surfaceIsLight(colorForVA(face.v, face.a)).toFixed(4));
    this.style.setProperty('--_text-l3', css(p.l3Ink));
  }

  // ── Events ───────────────────────────────────────────────────────────────

  private _emitChange() {
    const s = this._state;
    if (!s.face && s.chosen.length === 0) return; // nothing to report yet
    this.dispatchEvent(new CustomEvent<Rating>('change', {
      detail: raterRating(s),
      bubbles: true,
      composed: true,
    }));
  }

  private _onSubmit() {
    if (!canFinish(this._state)) return; // Done waits for a word
    this.dispatchEvent(new CustomEvent<Rating>('commit', {
      detail: raterRating(this._state),
      bubbles: true,
      composed: true,
    }));
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  protected override updated(changed: PropertyValues) {
    // Color vars feed both modes:
    //  - 'background' uses them to paint the surface glow and selected chips.
    //  - 'words' uses them for the submit button (the only thing that still
    //    pulls a host-level color in that mode); each chip overrides via
    //    inline `--_l3-{r,g,b}` from its own emotion's V/A.
    if ((changed.has('colorMode') || changed.has('theme')) && this.colorMode) {
      this._updateColorVars();
    }
  }

  // theme="auto" follows the OS setting, which can change while mounted.
  private _schemeQuery?: MediaQueryList;
  private _onSchemeChange = () => {
    if (this.theme !== 'auto') return;
    if (this.colorMode) this._updateColorVars();
    this.requestUpdate(); // chips are drawn from JS colors, not CSS, so they need a re-render
  };

  override connectedCallback() {
    super.connectedCallback();
    if (typeof matchMedia === 'undefined') return;
    this._schemeQuery = matchMedia('(prefers-color-scheme: dark)');
    this._schemeQuery.addEventListener('change', this._onSchemeChange);
    this._motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._schemeQuery?.removeEventListener('change', this._onSchemeChange);
    this._clearDwell();
  }

  // ── Render ───────────────────────────────────────────────────────────────

  override render() {
    const s = this._state;
    const unset = s.face === null;
    const face = s.face ?? UNSET_FACE;
    const theme = resolveTheme(this.theme);
    const strings = this.strings;
    // Surface glow only paints in 'background' mode, and only once the face
    // is set. In 'words' mode the color story lives on the chips.
    const glowOn = this.colorMode === 'background' && !unset;
    const wordsMode = this.colorMode === 'words';
    const hasWords = canFinish(s);
    const pad = faceToPad(face.v, face.a);
    // The dot under the finger: the chosen-word color on a face-colored
    // surface, the ink at 35% otherwise (padColors).
    const dot = padColors(face.v, face.a, theme, glowOn ? 'color' : 'neutral').dot;

    // One palette per mode, drawn by the same chipStyle an app can call. Words
    // mode gives each chip its own color; the others share one.
    const shared: ChipColors = glowOn ? surfacePalette(face.v, face.a, theme) : neutralPalette(theme);
    const chipColors = (emotion: { name: string; v: number; a: number }): ChipColors =>
      wordsMode ? this._wordColors(emotion, theme) : shared;
    const levelOf = (name: EmotionName) => s.chosen.find(c => c.name === name)?.level ?? 0;
    // Each adjustable value sits on its nearest stop; an unset face sits at the centre.
    const stop = (value: number | undefined) => {
      if (value === undefined) return FACE_STEPS.indexOf(0);
      let best = 0;
      FACE_STEPS.forEach((step, i) => { if (Math.abs(step - value) < Math.abs(FACE_STEPS[best]! - value)) best = i; });
      return best;
    };

    return html`
      <div class="surface">
        <div
          class="glow${glowOn ? ' on' : ''}"
          style="background: ${vaColor(face.v, face.a)}"
        ></div>

        <div
          class="face-zone${unset ? ' unset' : ''}"
          @pointerdown=${this._onPointerDown}
          @pointermove=${this._onPointerMove}
          @pointerup=${this._onPointerUp}
          @pointercancel=${this._onPointerCancel}
        >
          <affect-kit-face
            id="face-el"
            .v=${face.v}
            .a=${face.a}
            .animated=${this.animated && !unset}
            .motionScale=${s.dragging ? FACE_MOTION.dragScale : 1}
          ></affect-kit-face>
          <div
            class="ghost-dot${unset ? '' : ' visible'}"
            style="left:${(pad.x * 100).toFixed(2)}%;top:${(pad.y * 100).toFixed(2)}%;background:${dot}"
          ></div>
          <input
            class="adjust"
            type="range" min="0" max="${FACE_STEPS.length - 1}" step="1"
            .value=${String(stop(s.face?.v))}
            aria-label=${strings.pleasant}
            aria-valuetext=${axisValueText('pleasant', s.face, strings)}
            @input=${(e: Event) => this._onAdjust('pleasant', e)}
          />
          <input
            class="adjust"
            type="range" min="0" max="${FACE_STEPS.length - 1}" step="1"
            .value=${String(stop(s.face?.a))}
            aria-label=${strings.energized}
            aria-valuetext=${axisValueText('energized', s.face, strings)}
            @input=${(e: Event) => this._onAdjust('energized', e)}
          />
        </div>

        ${s.revealed ? nothing : html`
          <button class="to-words" type="button" @click=${this._showWords}>
            ${strings.showWords ?? A11Y_STRINGS_EN.showWords}
          </button>
        `}

        <div class="chips-zone${s.revealed ? '' : ' empty'}">
          ${this.hideSubmit && !this.chipsHint ? nothing : html`
            <div class="chip-header${s.dragging ? ' dragging' : ''}${this.hideSubmit && hasWords ? ' folded' : ''}">
              ${this.chipsHint ? html`<p class="chips-hint${hasWords ? ' gone' : ''}" part="hint">${this.chipsHint}</p>` : nothing}
              ${this.hideSubmit ? nothing : html`
                <button
                  class="submit-btn${hasWords ? ' visible' : ''}"
                  @click=${this._onSubmit}
                >${this.submitLabel}</button>
              `}
            </div>
          `}
          <div class="chip-list">
            ${EMOTIONS.map(emotion => html`
              <affect-kit-chip
                data-name="${emotion.name}"
                style="order:${s.order.indexOf(emotion.name)}"
                .label=${emotion.name}
                .level=${levelOf(emotion.name)}
                .colors=${chipColors(emotion)}
                .theme=${theme}
                .strings=${strings}
                @click=${() => this._tap(emotion.name)}
              ></affect-kit-chip>
            `)}
          </div>
          ${this.showVad ? (() => {
            // Resolved VAD for the debug readout: the words' composite when
            // chosen, otherwise the face with d = 0.
            const r = raterRating(s);
            const vad = r.composite ?? { v: face.v, a: face.a, d: 0 };
            return html`
              <p class="vad-readout">
                V ${vad.v.toFixed(2)} &middot; A ${vad.a.toFixed(2)} &middot; D ${vad.d.toFixed(2)}
              </p>
            `;
          })() : nothing}
        </div>
      </div>
    `;
  }

  // Per-word colors depend only on the word and the theme, so compute each once.
  private _wordColorCache = new Map<string, ChipColors>();

  private _wordColors(emotion: { name: string; v: number; a: number }, theme: 'light' | 'dark'): ChipColors {
    const key = `${theme}:${emotion.name}`;
    let colors = this._wordColorCache.get(key);
    if (!colors) {
      colors = wordChipColors(emotion.v, emotion.a, theme);
      this._wordColorCache.set(key, colors);
    }
    return colors;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affect-kit-rater': AffectKitRater;
  }

  interface HTMLElementEventMap {
    /** Emitted after pointer release or chip toggle. `event.detail` is the {@link Rating}. */
    change: CustomEvent<Rating>;
    /** Emitted when the user clicks the submit button — the explicit "done" signal. `event.detail` is the final {@link Rating}. */
    commit: CustomEvent<Rating>;
    /** Emitted once, when the words first show: the face settled, or "Choose words without the face". */
    reveal: CustomEvent<void>;
  }
}
