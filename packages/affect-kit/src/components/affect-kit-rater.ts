import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { colorForVA, darkerForChips, lighterForChips, surfaceIsLight, type Rgb } from '../core/color';
import { colorModeConverter } from '../core/color-mode';
import { themeConverter } from '../core/theme';
import { buildRating } from '../core/vad';
import { EMOTIONS } from '../vocabulary/en';
import type { ColorMode, Rating, EmotionName, Theme } from '../core/types';
import type { AffectKitFace } from './affect-kit-face';

const DWELL_MS = 500;
const HIGH_AROUSAL_THRESH = 0.3;
const MAX_LABELS = 5;

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
         stylesheet derives text/bg from these via color-mix. */
      --_ink:   #1a1a1a;
      --_paper: white;

      /* V/A-driven (set by _updateColorVars at runtime; defaults are neutral). */
      --_r: 128; --_g: 128; --_b: 128;
      --_l3-r: 80; --_l3-g: 80; --_l3-b: 80;
      --_surface-is-light: 0;
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
      transition: opacity 0.5s ease, background 50ms linear;
    }
    .glow.on { opacity: 0.85; }

    /* ── Face pad ─────────────────────────────────────────── */
    .face-zone {
      position: relative;
      flex: 0 0 auto;
      width: 100%;
      max-width: 200px;
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
      width: 94%;
      height: 94%;
      pointer-events: none;
      filter: drop-shadow(0 10px 28px rgba(0,0,0,0.14));
    }

    .ghost-dot {
      position: absolute;
      width: 9px;
      height: 9px;
      background: color-mix(in srgb, var(--_ink) 28%, transparent);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
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
        opacity 0.65s ease,
        filter  0.65s ease,
        transform 0.7s cubic-bezier(0.16, 1, 0.3, 1),
        max-height 0.7s cubic-bezier(0.4, 0, 0.2, 1),
        min-height 0.7s cubic-bezier(0.4, 0, 0.2, 1),
        padding   0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .chips-zone.empty {
      opacity: 0;
      filter: blur(4px);
      pointer-events: none;
      transform: translateY(8px);
      max-height: 0;
      min-height: 0;
      padding-top: 0;
      padding-bottom: 0;
    }

    .chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: baseline;
      justify-content: center;
    }

    .chip {
      padding: 0.40em 0.88em;
      background: color-mix(in srgb, var(--_ink) 5%, transparent);
      color:      color-mix(in srgb, var(--_ink) 55%, transparent);
      border: none;
      border-radius: 999px;
      font-family: inherit;
      font-size: 0.82em;
      font-weight: 500;
      cursor: pointer;
      /* Color/bg feedback fires immediately on click (0.18s) so the
         user feels the press right away. The size morph is slower
         (0.35s) and starts after a tiny 50ms delay — neighbouring
         chips get a beat to settle into a new wrap line instead of
         jumping mid-click. Standard ease-in-out (not the bouncy
         overshoot curve) keeps the reflow calm. */
      transition:
        background 0.18s ease,
        color      0.18s ease,
        padding    0.35s cubic-bezier(0.4, 0, 0.2, 1) 0.05s,
        font-size  0.35s cubic-bezier(0.4, 0, 0.2, 1) 0.05s,
        font-weight 0.18s ease,
        transform  0.45s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    .chip:hover {
      background: color-mix(in srgb, var(--_ink) 10%, transparent);
      color:      color-mix(in srgb, var(--_ink) 85%, transparent);
    }

    /*
     * Mono: greyscale by intensity. The chip "fills with ink" as level
     * increases — bg climbs from a faint tint to solid --_ink, and text
     * flips from ink to paper for full contrast at high levels.
     *
     * Level signal across ALL color modes (a11y: not color-alone):
     *  - bg/fill ramp (existing per color mode)
     *  - font-weight (500 / 600 / 700 / 800)
     *  - font-size: only modest growth (~7% total levels 0→3) so chips
     *    rarely push neighbors across the wrap line on click
     *  - padding: CONSTANT across levels — chip outer height stays
     *    fixed; most of the width is fixed too
     *  - dots via ::after (• / •• / •••) — the dominant intensity
     *    signal, small and faint so they read as pips not text
     */
    .chip.level-1 {
      background: color-mix(in srgb, var(--_ink) 16%, transparent);
      color:      color-mix(in srgb, var(--_ink) 85%, transparent);
      font-weight: 600; font-size: 0.84em;
    }
    .chip.level-2 {
      background: color-mix(in srgb, var(--_ink) 70%, var(--_paper));
      color: var(--_paper);
      font-weight: 700; font-size: 0.86em;
    }
    .chip.level-3 {
      background: var(--_ink);
      color: var(--_paper);
      font-weight: 800; font-size: 0.88em;
    }
    /* Intensity pips. Sized small + faint so they read as a count
       indicator rather than text. */
    .chip.level-1::after,
    .chip.level-2::after,
    .chip.level-3::after {
      margin-left: 0.45em;
      letter-spacing: 0.15em;
      font-weight: 400;
      opacity: 0.65;
      font-size: 0.85em;
      vertical-align: 0.05em;
    }
    .chip.level-1::after { content: '\\2022'; }
    .chip.level-2::after { content: '\\2022\\2022'; }
    .chip.level-3::after { content: '\\2022\\2022\\2022'; }

    /* Color mode: unselected chips adapt to surface lightness */
    :host([color-mode]) .chip {
      background: var(--_chip-bg, color-mix(in srgb, var(--_ink) 5%, transparent));
      color: var(--_chip-ink, color-mix(in srgb, var(--_ink) 55%, transparent));
    }
    :host([color-mode]) .chip:hover {
      background: var(--_chip-hover-bg, color-mix(in srgb, var(--_ink) 10%, transparent));
      color: var(--_chip-ink, color-mix(in srgb, var(--_ink) 85%, transparent));
    }
    /* Color mode: selected chips absorb the current V/A color. Size /
       weight / padding inherit from the base .chip.level-N rules above
       so the level signal stays consistent across color modes. */
    :host([color-mode]) .chip.level-1 {
      background: rgba(
        var(--_l3-r), var(--_l3-g), var(--_l3-b),
        calc(0.30 + var(--_surface-is-light) * 0.30)
      );
      color: rgba(0,0,0,0.88);
      box-shadow: 0 1px 2px rgba(0,0,0,0.08);
    }
    :host([color-mode]) .chip.level-2 {
      background: rgba(
        var(--_l3-r), var(--_l3-g), var(--_l3-b),
        calc(0.65 + var(--_surface-is-light) * 0.20)
      );
      color: rgba(0,0,0,0.94);
      box-shadow: 0 1px 3px rgba(0,0,0,0.10), 0 1px 1px rgba(0,0,0,0.06);
    }
    :host([color-mode]) .chip.level-3 {
      background: rgba(var(--_l3-r), var(--_l3-g), var(--_l3-b), 1);
      color: var(--_text-l3, rgba(0,0,0,0.95));
      box-shadow: 0 2px 6px rgba(0,0,0,0.16), 0 1px 2px rgba(0,0,0,0.10);
    }

    /*
     * 'words' mode: unselected chips get a faint tint of their OWN
     * emotion color (the per-chip --_l3-{r,g,b} are set inline in render).
     * Selected chips already absorb the color via the level rules above.
     */
    :host([color-mode="words"]) .chip {
      background: rgba(var(--_l3-r), var(--_l3-g), var(--_l3-b), 0.14);
      color: color-mix(in srgb, var(--_ink) 68%, transparent);
    }
    :host([color-mode="words"]) .chip:hover {
      background: rgba(var(--_l3-r), var(--_l3-g), var(--_l3-b), 0.24);
      color: color-mix(in srgb, var(--_ink) 90%, transparent);
    }
    /* Dark theme: the whole alpha ramp is rebuilt so V/A colors don't
       mix into muddy hues against the dark surface.

       Light theme: 14% tint reads as a clear pastel on white because
       alpha blending toward white preserves saturation perception.
       Dark theme: 14-28% tint blends toward #1a1a1a, killing saturation
       and pulling distinct hues toward similar olive/gray. So the dark
       ramp is bumped:

         unselected: 0.14 → 0.36 (colors actually look like colors)
         level 1:    0.30 → 0.55 (visibly distinct from unselected step)
         level 2:    0.65 → 0.78 (stronger step toward level 3)
         level 3:    1.00     (unchanged — full V/A color)

       Text color is also re-set per level: level 1 keeps light text
       (chip bg is still mostly dark); level 2/3 use dark text (chip
       bg is bright enough). The pad-derived --_text-l3 is overridden
       because in words mode each chip has its own V/A color, not the
       pad's. */
    :host([color-mode="words"][theme="dark"]) .chip {
      background: rgba(var(--_l3-r), var(--_l3-g), var(--_l3-b), 0.36);
      color: color-mix(in srgb, var(--_ink) 85%, transparent);
    }
    :host([color-mode="words"][theme="dark"]) .chip:hover {
      background: rgba(var(--_l3-r), var(--_l3-g), var(--_l3-b), 0.48);
      color: var(--_ink);
    }
    :host([color-mode="words"][theme="dark"]) .chip.level-1 {
      background: rgba(var(--_l3-r), var(--_l3-g), var(--_l3-b), 0.55);
      color: rgba(0,0,0,0.88);
    }
    :host([color-mode="words"][theme="dark"]) .chip.level-2 {
      background: rgba(var(--_l3-r), var(--_l3-g), var(--_l3-b), 0.78);
      color: rgba(0,0,0,0.94);
    }
    :host([color-mode="words"][theme="dark"]) .chip.level-3 {
      background: rgba(var(--_l3-r), var(--_l3-g), var(--_l3-b), 1);
      color: rgba(0,0,0,0.95);
    }
    @media (prefers-color-scheme: dark) {
      :host([color-mode="words"][theme="auto"]) .chip {
        background: rgba(var(--_l3-r), var(--_l3-g), var(--_l3-b), 0.36);
        color: color-mix(in srgb, var(--_ink) 85%, transparent);
      }
      :host([color-mode="words"][theme="auto"]) .chip:hover {
        background: rgba(var(--_l3-r), var(--_l3-g), var(--_l3-b), 0.48);
        color: var(--_ink);
      }
      :host([color-mode="words"][theme="auto"]) .chip.level-1 {
        background: rgba(var(--_l3-r), var(--_l3-g), var(--_l3-b), 0.55);
        color: rgba(0,0,0,0.88);
      }
      :host([color-mode="words"][theme="auto"]) .chip.level-2 {
        background: rgba(var(--_l3-r), var(--_l3-g), var(--_l3-b), 0.78);
        color: rgba(0,0,0,0.94);
      }
      :host([color-mode="words"][theme="auto"]) .chip.level-3 {
        background: rgba(var(--_l3-r), var(--_l3-g), var(--_l3-b), 1);
        color: rgba(0,0,0,0.95);
      }
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
      transition: opacity 0.25s ease;
    }
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

    /* Wide layout: face left, chips right */
    @container (min-width: 860px) {
      .surface {
        flex-direction: row;
        align-items: stretch;
        min-height: 360px;
      }
      .surface:has(.chips-zone.empty) { min-height: 0; }
      .face-zone {
        flex: 0 0 auto;
        width: 280px;
        max-width: 280px;
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
   * Surface theme. See {@link Theme}.
   * - `'light'` (default) — dark ink on white paper.
   * - `'dark'` — white ink on dark paper. Chip backgrounds invert.
   * - `'auto'` — follow `prefers-color-scheme`.
   *
   * Orthogonal to {@link ColorMode}.
   */
  @property({ converter: themeConverter, reflect: true })
  theme: Theme = 'light';

  @state() private _padV = 0;
  @state() private _padA = 0;
  @state() private _levels = new Map<string, 0 | 1 | 2 | 3>();
  @state() private _revealed = false;
  @state() private _sortOrder: string[] = EMOTIONS.map(e => e.name);
  @state() private _dragging = false;

  @query('#face-el') private _faceEl?: AffectKitFace;

  private _dwellTimer: ReturnType<typeof setTimeout> | null = null;
  private _hasFlippedOnce = false;
  private _ghostX = 0.5;
  private _ghostY = 0.5;

  /**
   * Programmatic prefill — rare, but useful for editing a captured rating.
   * Reveals chips immediately and sets the pad + label state from the rating.
   */
  setRating(rating: Rating): void {
    this._padV = rating.face.v;
    this._padA = rating.face.a;
    const levels = new Map<string, 0 | 1 | 2 | 3>();
    // Rating.level is `number` to support averaged longitudinal data, but the
    // rater itself only renders integer chip levels — round and clamp on prefill.
    for (const l of rating.labels) {
      const lv = Math.round(l.level);
      const chipLv = (lv < 1 ? 1 : lv > 3 ? 3 : lv) as 1 | 2 | 3;
      levels.set(l.name, chipLv);
    }
    this._levels = levels;
    this._revealed = true;
    this._ghostX = (rating.face.v + 1) / 2;
    this._ghostY = (1 - rating.face.a) / 2;
    this._sortOrder = this._computeSortOrder();
    this._hasFlippedOnce = true;
    this._updateColorVars();
  }

  /**
   * Clear all state back to the initial empty position.
   */
  reset(): void {
    this._padV = 0;
    this._padA = 0;
    this._levels = new Map();
    this._revealed = false;
    this._hasFlippedOnce = false;
    this._ghostX = 0.5;
    this._ghostY = 0.5;
    this._sortOrder = EMOTIONS.map(e => e.name);
    this._updateColorVars();
  }

  // ── Pointer handling ──────────────────────────────────────────────────────

  private _onPointerDown(e: PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this._dragging = true;
    this._updatePad(e);
  }

  private _onPointerMove(e: PointerEvent) {
    if (!this._dragging) return;
    this._updatePad(e);
    // Reset dwell timer: settle fires if user pauses for DWELL_MS
    if (this._dwellTimer != null) clearTimeout(this._dwellTimer);
    this._dwellTimer = setTimeout(() => this._settle(), DWELL_MS);
  }

  private _onPointerUp() {
    if (!this._dragging) return;
    this._dragging = false;
    if (this._dwellTimer != null) { clearTimeout(this._dwellTimer); this._dwellTimer = null; }
    this._settle();
  }

  private _onPointerCancel() {
    this._dragging = false;
    if (this._dwellTimer != null) { clearTimeout(this._dwellTimer); this._dwellTimer = null; }
  }

  private _updatePad(e: PointerEvent) {
    const zone = this.shadowRoot!.querySelector<HTMLElement>('.face-zone')!;
    const rect = zone.getBoundingClientRect();
    this._ghostX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    this._ghostY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    this._padV = this._ghostX * 2 - 1;
    this._padA = 1 - this._ghostY * 2;
    this._updateColorVars();
  }

  // ── Settle: reveal + sort + emit ─────────────────────────────────────────

  private _settle() {
    if (!this._revealed) this._revealed = true;
    this._sortWithFlip().catch(() => {/* ignore async errors */});
    this._emitChange();
  }

  // ── Chip interaction ──────────────────────────────────────────────────────

  private _cycleChip(name: string) {
    const cur = this._levels.get(name) ?? 0;
    // Cap total selected labels at MAX_LABELS — only block adding a new one.
    if (cur === 0) {
      const active = [...this._levels.values()].filter(l => l > 0).length;
      if (active >= MAX_LABELS) return;
    }
    const next = ((cur + 1) % 4) as 0 | 1 | 2 | 3;
    const levels = new Map(this._levels);
    levels.set(name, next);
    this._levels = levels;

    // Shock face on high-arousal chip toggle up
    if (next > cur && next > 0) {
      const emotion = EMOTIONS.find(e => e.name === name);
      if (emotion && emotion.a > HIGH_AROUSAL_THRESH) {
        this._faceEl?.triggerShock();
      }
    }

    this._emitChange();
  }

  // ── Sort + FLIP ───────────────────────────────────────────────────────────

  private _computeSortOrder(): string[] {
    return [...EMOTIONS]
      .map(e => ({
        name: e.name,
        dist: Math.hypot(e.v - this._padV, e.a - this._padA),
      }))
      .sort((a, b) => a.dist - b.dist)
      .map(e => e.name);
  }

  private async _sortWithFlip() {
    const newOrder = this._computeSortOrder();

    if (!this._hasFlippedOnce) {
      this._hasFlippedOnce = true;
      this._sortOrder = newOrder;
      return; // silent first sort — chips are still fading in
    }

    // FIRST: capture positions before order change
    const chips = this.shadowRoot!.querySelectorAll<HTMLElement>('.chip');
    const first = new Map<string, DOMRect>();
    chips.forEach(el => first.set(el.dataset.name!, el.getBoundingClientRect()));

    // Apply new order (triggers Lit re-render)
    this._sortOrder = newOrder;
    await this.updateComplete;

    // LAST + INVERT: read new positions, apply inverse transforms
    this.shadowRoot!.querySelectorAll<HTMLElement>('.chip').forEach(el => {
      const name = el.dataset.name!;
      const oldRect = first.get(name);
      if (!oldRect) return;
      const newRect = el.getBoundingClientRect();
      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top  - newRect.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px,${dy}px)`;
    });

    // PLAY: next frame — restore transitions, clear transforms
    requestAnimationFrame(() => {
      this.shadowRoot?.querySelectorAll<HTMLElement>('.chip').forEach(el => {
        el.style.transition = '';
        el.style.transform = '';
      });
    });
  }

  // ── Color vars ────────────────────────────────────────────────────────────

  private _updateColorVars() {
    const rgb = colorForVA(this._padV, this._padA);
    const darker = darkerForChips(rgb);
    const isLight = surfaceIsLight(rgb);
    const darkerLum =
      0.2126 * (darker[0] / 255) + 0.7152 * (darker[1] / 255) + 0.0722 * (darker[2] / 255);
    this.style.setProperty('--_r',   String(rgb[0]));
    this.style.setProperty('--_g',   String(rgb[1]));
    this.style.setProperty('--_b',   String(rgb[2]));
    this.style.setProperty('--_l3-r', String(darker[0]));
    this.style.setProperty('--_l3-g', String(darker[1]));
    this.style.setProperty('--_l3-b', String(darker[2]));
    this.style.setProperty('--_surface-is-light', isLight.toFixed(4));
    this.style.setProperty('--_text-l3',
      darkerLum > 0.45 ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.96)');
    this.style.setProperty('--_chip-ink',
      isLight ? 'rgba(0,0,0,0.60)' : 'rgba(255,255,255,0.82)');
    this.style.setProperty('--_chip-bg',
      isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.16)');
    this.style.setProperty('--_chip-hover-bg',
      isLight ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.26)');
  }

  // ── Change event ─────────────────────────────────────────────────────────

  private _emitChange() {
    const labels: Array<{ name: EmotionName; level: number }> = [];
    for (const [name, level] of this._levels) {
      if (level > 0) labels.push({ name: name as EmotionName, level: level as 1 | 2 | 3 });
    }
    const rating = buildRating({ face: { v: this._padV, a: this._padA }, labels });
    this.dispatchEvent(new CustomEvent<Rating>('change', {
      detail: rating,
      bubbles: true,
      composed: true,
    }));
  }

  // ── Commit (explicit submit) ──────────────────────────────────────────────

  private _onSubmit() {
    const labels: Array<{ name: EmotionName; level: number }> = [];
    for (const [name, level] of this._levels) {
      if (level > 0) labels.push({ name: name as EmotionName, level: level as 1 | 2 | 3 });
    }
    const rating = buildRating({ face: { v: this._padV, a: this._padA }, labels });
    this.dispatchEvent(new CustomEvent<Rating>('commit', {
      detail: rating,
      bubbles: true,
      composed: true,
    }));
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  protected override updated(changed: PropertyValues) {
    // Color vars feed both modes:
    //  - 'background' uses them to paint the surface glow and selected chips.
    //  - 'words' uses them for the submit button (the only thing that still
    //    pulls a host-level color in that mode); each chip overrides via
    //    inline `--_l3-{r,g,b}` from its own emotion's V/A.
    if (changed.has('colorMode') && this.colorMode) {
      this._updateColorVars();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  override render() {
    const [r, g, b] = colorForVA(this._padV, this._padA) as Rgb;
    const glowBg = `rgb(${r},${g},${b})`;
    // Surface glow only paints in 'background' mode. In 'words' mode the
    // color story lives on the chips, so the surface stays neutral.
    const glowOn = this.colorMode === 'background';
    const wordsMode = this.colorMode === 'words';

    const activeLabels: Array<{ name: EmotionName; level: number }> = [];
    for (const [name, level] of this._levels) {
      if (level > 0) activeLabels.push({ name: name as EmotionName, level: level as 1 | 2 | 3 });
    }
    const hasLabels = activeLabels.length > 0;
    const vad = hasLabels
      ? this._computeDisplayVAD(activeLabels)
      : { v: this._padV, a: this._padA, d: 0 };

    return html`
      <div class="surface">
        <div
          class="glow${glowOn ? ' on' : ''}"
          style="background: ${glowBg}"
        ></div>

        <div
          class="face-zone"
          @pointerdown=${this._onPointerDown}
          @pointermove=${this._onPointerMove}
          @pointerup=${this._onPointerUp}
          @pointercancel=${this._onPointerCancel}
        >
          <affect-kit-face
            id="face-el"
            .v=${this._padV}
            .a=${this._padA}
            .animated=${this.animated}
            .motionScale=${this._dragging ? 0.2 : 1.0}
          ></affect-kit-face>
          <div
            class="ghost-dot${this._padV !== 0 || this._padA !== 0 ? ' visible' : ''}"
            style="left:${(this._ghostX * 100).toFixed(2)}%;top:${(this._ghostY * 100).toFixed(2)}%"
          ></div>
        </div>

        <div class="chips-zone${this._revealed ? '' : ' empty'}">
          <div class="chip-header${this._dragging ? ' dragging' : ''}">
            <p class="chips-hint${hasLabels ? ' gone' : ''}">name what you feel</p>
            <button
              class="submit-btn${hasLabels ? ' visible' : ''}"
              @click=${this._onSubmit}
            >${this.submitLabel}</button>
          </div>
          <div class="chip-list">
            ${EMOTIONS.map(emotion => {
              const level = this._levels.get(emotion.name) ?? 0;
              const order = this._sortOrder.indexOf(emotion.name);
              // 'words' mode: each chip carries its own emotion's color
              // via inline --_l3-{r,g,b}, which shadows the host-level
              // (pad-V/A-derived) variables so the existing chip rules
              // resolve to the per-emotion color. Uses the raw lexicon
              // color on light theme (chips match the result's V/A panel
              // for the same emotion), and lighterForChips on dark theme
              // so dim hues (cobalt, deep magenta) read through the 14%
              // alpha unselected tint against a dark surface.
              let chipStyle = `order:${order}`;
              if (wordsMode) {
                const raw = colorForVA(emotion.v, emotion.a);
                const useDark =
                  this.theme === 'dark' ||
                  (this.theme === 'auto' &&
                    typeof matchMedia !== 'undefined' &&
                    matchMedia('(prefers-color-scheme: dark)').matches);
                const [cr, cg, cb] = useDark ? lighterForChips(raw) : raw;
                chipStyle += `;--_l3-r:${cr};--_l3-g:${cg};--_l3-b:${cb}`;
              }
              return html`
                <button
                  class="chip${level > 0 ? ` level-${level}` : ''}"
                  data-name="${emotion.name}"
                  style="${chipStyle}"
                  @click=${() => this._cycleChip(emotion.name)}
                >${emotion.name}</button>
              `;
            })}
          </div>
          ${this.showVad ? html`
            <p class="vad-readout">
              V ${vad.v.toFixed(2)} &middot; A ${vad.a.toFixed(2)} &middot; D ${vad.d.toFixed(2)}
            </p>
          ` : nothing}
        </div>
      </div>
    `;
  }

  private _computeDisplayVAD(labels: Array<{ name: EmotionName; level: number }>) {
    // Resolved VAD for the debug readout: composite when labels are selected,
    // otherwise the raw face position with d=0.
    const rating = buildRating({ face: { v: this._padV, a: this._padA }, labels });
    return rating.composite ?? { v: rating.face.v, a: rating.face.a, d: 0 };
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
  }
}
