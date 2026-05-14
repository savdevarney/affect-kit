# affect-kit

## 0.4.1

### Patch Changes

- 508c6e4: `<affect-kit-rater>` chip redesign: outward concentric rings encode intensity.

  The chip-list now signals selection and level through a layered system:

  - **Selection**: binary color flip. Unselected chips are a muted V/A tint (or faint ink in mono); selected chips at _any_ level take the full V/A color (or solid ink in mono).
  - **Level (1 / 2 / 3)**: concentric rings that radiate outward from the chip's edge into the surrounding chip-list margin — 1 ring for level 1, 2 rings for level 2, 3 rings for level 3. The chip's interior size never changes when its level changes, so the chip-list never reflows on click.

  ### Implementation notes

  - The innermost ring is the chip's `border` (which always exists as a 2px transparent ring with `box-sizing: border-box` so chip dimensions stay constant; `border-color` flips to the ring color on selection).
  - Additional rings (for levels 2 and 3) are stacked outward `box-shadow`s separated by gap masks using a new `--_surface` CSS variable (defaults to `--_paper`; overridden in `color-mode="background"` to the V/A pad color so the gaps blend invisibly with the colored surface).
  - Mono ring color mixes `75% --_ink + 25% --_paper` — strong contrast against the surface the rings extend into, in both light and dark themes.
  - Color-mode ring color mixes `50% V/A + 50% --_ink` (light) or `45% V/A + 55% --_paper` (dark) so rings appear as a darker shade of the chip's V/A hue.
  - Hover lift is composed via a separate `--_chip-lift` CSS variable so it can layer with the ring stack without replacing it. Hover on selected chips also gets a stronger lift to keep the affordance visible.

  ### Outline ring on selected chips in color modes

  Selected chips in `color-mode="background"` (where the chip's V/A color matches the rater pad's V/A wash) and `color-mode="words"` also get a thin outline in the same hue family but darkened, reinforcing the chip's boundary against the colored surface.

  ### Chip-list spacing

  `gap` tightened to `14px 12px` so unselected chips sit close together; at level 3 the outward rings come within ~0.5px of touching adjacent selected chips' rings — conveys density without overlap.

  ### No public API changes

  All changes are visual on the existing `<affect-kit-rater>` element. No new attributes or properties.

## 0.4.0

### Minor Changes

- 20ec19b: New `layout` property on `<affect-kit-result>` and `<affect-kit-compare>` for consumers who want to force a stacked or side-by-side orientation regardless of available width.

  ```ts
  layout: "auto" | "stack" | "row"; // default 'auto'
  ```

  | value              | behavior                                                                                                                                                                                                |
  | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `'auto'` (default) | Container queries decide — stack at narrow widths, side-by-side when there's room. Existing behavior, no breaking change.                                                                               |
  | `'stack'`          | Always stacked, even when there's horizontal room. Use this when the consumer wants a deliberate vertical reading order.                                                                                |
  | `'row'`            | Side-by-side from a lower threshold than `'auto'` (240px on result, 320px on compare). Below the floor — where row would genuinely break — the component falls back to stacked rather than overflowing. |

  On `<affect-kit-result>` this controls face-vs-words orientation. On `<affect-kit-compare>` it controls the left-vs-right halves arrangement.

  ```html
  <!-- Always stacked, even on a wide page -->
  <affect-kit-result layout="stack" show-face show-labels></affect-kit-result>

  <!-- Insist on side-by-side comparison, accept stack only at extreme narrow -->
  <affect-kit-compare layout="row" show-face></affect-kit-compare>
  ```

  Playground gets a new `layout` segmented control on the result and compare cards.

### Patch Changes

- adba485: Word display: highlighter pills + count-driven scale on `<affect-kit-result>` and `<affect-kit-compare>`.

  ### Highlighter pills

  Each word in the result/compare display now sits in a soft tinted pill (rounded background tint), so sparse readouts feel deliberate rather than floating in space.

  | color-mode     | pill tone                                                         |
  | -------------- | ----------------------------------------------------------------- |
  | `null` (mono)  | `--_ink` at 11% alpha                                             |
  | `"words"`      | the word's own V/A color at 11% alpha                             |
  | `"background"` | `--_paper` at 55% alpha — a sticky-note highlight on the V/A wash |

  Pill padding has a px floor (`max(0.18em, 0.35rem)` / `max(0.55em, 0.75rem)`) so level-1 (small) pills don't crowd their text at small font sizes.

  ### Count-driven scale

  When fewer than 5 labels are present, the words container sets a `--_count-scale` CSS variable that multiplies the per-word font-size:

  | label count | scale           |
  | ----------- | --------------- |
  | 1           | 1.30×           |
  | 2           | 1.225×          |
  | 3           | 1.15×           |
  | 4           | 1.075×          |
  | 5+          | 1.0× (baseline) |

  A solo `'grateful'` reads as a deliberate statement rather than a tiny fragment.

  ### Implementation notes

  - Text opacity moved from the host element's `opacity` to a per-color `color-mix` alpha, so the pill background can keep its own (lower) alpha independent of text legibility.
  - Words container `gap` tightened from `0.4em 1.5em` to `0.4em 0.6em` to suit the new pill rhythm.
  - No public API changes — pure visual polish on the existing word display.

## 0.3.0

### Minor Changes

- 402c942: Dark mode + theme system. New `theme` prop on all four components.

  ### New: `theme` property

  ```ts
  theme: "light" | "dark" | "auto"; // default 'light'
  ```

  On `<affect-kit-rater>`, `<affect-kit-result>`, `<affect-kit-compare>`, and `<affect-kit-face>`. Orthogonal to `color-mode` — theme picks the page (paper + ink polarity); color-mode picks what gets painted on it.

  - `'light'` (default, no behavior change for existing consumers) — dark ink on white paper.
  - `'dark'` — white ink on dark paper. Mono chip backgrounds invert (chip "fills with ink" pattern works in both directions). In `color-mode="words"`, each label switches to a **lighter** V/A color variant so it stays legible on the dark surface.
  - `'auto'` — follows `prefers-color-scheme` via CSS media query. The explicit values always override OS preference.

  ```html
  <affect-kit-rater theme="dark"></affect-kit-rater>
  <affect-kit-compare
    theme="auto"
    show-face
    color-mode="words"
  ></affect-kit-compare>
  ```

  ### Implementation notes

  - Internal `--_ink` / `--_paper` CSS variables drive every text/surface color. Not exposed as public CSS knobs yet — consumers wanting per-color overrides should file a request.
  - Hardcoded `rgba(0,0,0,N)` colors swapped for `color-mix(in srgb, var(--_ink) N%, transparent)` — auto-inverts based on ink polarity.
  - Mono chip backgrounds use `color-mix(in srgb, var(--_ink) Xpct, var(--_paper))` so the chip "fills with ink" cleanly in both light and dark.
  - `<affect-kit-result>` words-mode now uses the **raw** brand color on light surfaces (no darkening). The darker/lighter chip-variant helpers are only applied where color sits _under_ text — background mode and rater selected chip-as-bg. Dark-theme words still get a lift via `lighterForChips` because raw cobalt/teal would be unreadable on dark paper; light-theme drops the muting so vivid colors come through.
  - New internal `lighterForChips()` helper in `core/color.ts` mirrors `darkerForChips()` for dark-theme words-mode.
  - At `color-mode={null}` (off), all three components drop their paper + card shadow so they composit transparently on the host surface. `color-mode="background"`/`"words"` keep the full card surface as before.

  ### Playground

  Each component card now has a `theme` segmented control (light / dark / auto) alongside the existing color-mode toggle. All six theme × color-mode combinations are interactive.

  ### Not breaking

  All defaults preserved. Existing `<affect-kit-rater>` (no theme attribute) still renders identical to v0.2.0.

## 0.2.0

### Minor Changes

- 63140f5: Data-shape cleanup + compare API tightening. Two themes, one release.

  ### `EmotionLabel.vad` is now optional

  The rater still emits with `vad` inline (Rating is a self-describing snapshot). For persistence, the coordinates are a deterministic function of `name` — store the minimal `{ name, level }` form and rehydrate on read. Existing v0.1 consumers see no behaviour change at runtime; only the type's optionality is new.

  ```ts
  interface EmotionLabel {
    name: EmotionName;
    level: number;
    vad?: { v: number; a: number; d: number }; // now optional
  }
  ```

  ### New: `EMOTION_LABELS`, `stripVad()`, `rehydrate()`

  ```ts
  import { EMOTION_LABELS, stripVad, rehydrate } from "affect-kit";

  // Canonical V/A/D lookup, JSON-serializable Record
  const { v, a, d } = EMOTION_LABELS["joy"];

  // Persistence flow
  db.ratings.insert(stripVad(rating)); // labels: { name, level }
  result.rating = rehydrate(rowFromDb); // labels: { name, level, vad }
  ```

  `computeComposite()` is now lookup-tolerant — it falls back to `EMOTION_LABELS` when a label is missing inline `vad`, so stripped Ratings work without rehydrating first.

  ### Breaking: `<affect-kit-compare>` no longer accepts `Rating[]`

  `beforeRating` and `afterRating` now require a single `Rating | null`. For time-series comparisons, average upstream:

  ```diff
  - cmp.beforeRating = lastWeekRatings;      // Rating[]
  + cmp.beforeRating = averageRatings(lastWeekRatings);
  ```

  Why: averaging inside the component re-ran on every render. With large arrays — especially React consumers passing `[...]` inline — that's a UI freeze. Pushing it out lets consumers memoize where they have the windowing context.

  ### New: `useAverageRatings()` React hook

  In `@affect-kit/react`, a memoized wrapper for the pattern above:

  ```tsx
  import { Compare, useAverageRatings } from "@affect-kit/react";

  function WeekComparison({ lastWeek, thisWeek }) {
    const before = useAverageRatings(lastWeek);
    const after = useAverageRatings(thisWeek);
    return <Compare beforeRating={before} afterRating={after} />;
  }
  ```

## 0.1.0

### Minor Changes

- 475d5fb: Initial public release.

  Four custom elements for dimensional emotion rating, built with Lit and grounded in the NRC VAD Lexicon:

  - `<affect-kit-rater>` — interactive V/A pad with emotion-label refinement; emits `commit` with a structured `Rating`.
  - `<affect-kit-result>` — renders a committed `Rating` as face + dominant label + optional color chip.
  - `<affect-kit-compare>` — two snapshots side-by-side, or two arrays of ratings averaged.
  - `<affect-kit-face>` — standalone face glyph driven by `v` and `a` props.

  Each component ships as its own entry point (`affect-kit/rater`, `/result`, `/compare`, `/face`) plus a bundled side-effect import (`affect-kit`). ESM-only, TypeScript-first, no framework required.

  The `@affect-kit/react` companion package ships in lockstep with typed React wrappers (`<Rater>`, `<Result>`, `<Compare>`, `<Face>`) — idiomatic `onChange` handlers, ref forwarding, and typed props via [`@lit/react`](https://www.npmjs.com/package/@lit/react).

  Site and docs: [affectkit.com](https://affectkit.com).
