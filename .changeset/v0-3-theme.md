---
'affect-kit': minor
'@affect-kit/react': minor
---

Dark mode + theme system. New `theme` prop on all four components.

### New: `theme` property

```ts
theme: 'light' | 'dark' | 'auto'  // default 'light'
```

On `<affect-kit-rater>`, `<affect-kit-result>`, `<affect-kit-compare>`, and `<affect-kit-face>`. Orthogonal to `color-mode` — theme picks the page (paper + ink polarity); color-mode picks what gets painted on it.

- `'light'` (default, no behavior change for existing consumers) — dark ink on white paper.
- `'dark'` — white ink on dark paper. Mono chip backgrounds invert (chip "fills with ink" pattern works in both directions). In `color-mode="words"`, each label switches to a **lighter** V/A color variant so it stays legible on the dark surface.
- `'auto'` — follows `prefers-color-scheme` via CSS media query. The explicit values always override OS preference.

```html
<affect-kit-rater theme="dark"></affect-kit-rater>
<affect-kit-compare theme="auto" show-face color-mode="words"></affect-kit-compare>
```

### Implementation notes

- Internal `--_ink` / `--_paper` CSS variables drive every text/surface color. Not exposed as public CSS knobs yet — consumers wanting per-color overrides should file a request.
- Hardcoded `rgba(0,0,0,N)` colors swapped for `color-mix(in srgb, var(--_ink) N%, transparent)` — auto-inverts based on ink polarity.
- Mono chip backgrounds use `color-mix(in srgb, var(--_ink) Xpct, var(--_paper))` so the chip "fills with ink" cleanly in both light and dark.
- `<affect-kit-result>` words-mode now uses the **raw** brand color on light surfaces (no darkening). The darker/lighter chip-variant helpers are only applied where color sits *under* text — background mode and rater selected chip-as-bg. Dark-theme words still get a lift via `lighterForChips` because raw cobalt/teal would be unreadable on dark paper; light-theme drops the muting so vivid colors come through.
- New internal `lighterForChips()` helper in `core/color.ts` mirrors `darkerForChips()` for dark-theme words-mode.
- At `color-mode={null}` (off), all three components drop their paper + card shadow so they composit transparently on the host surface. `color-mode="background"`/`"words"` keep the full card surface as before.

### Playground

Each component card now has a `theme` segmented control (light / dark / auto) alongside the existing color-mode toggle. All six theme × color-mode combinations are interactive.

### Not breaking

All defaults preserved. Existing `<affect-kit-rater>` (no theme attribute) still renders identical to v0.2.0.
