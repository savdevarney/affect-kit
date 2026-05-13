# affect-kit

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
