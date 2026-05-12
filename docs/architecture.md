# Package architecture

> The canonical, living API reference lives at **[affectkit.com/docs](https://affectkit.com/docs)**.
> The source for that page is [`apps/site/src/pages/docs/index.astro`](../apps/site/src/pages/docs/index.astro).

This file holds package-level design notes that are too internal for the site but still worth recording.

## Public API surface

The published package exposes four custom elements, a handful of TypeScript types, and a set of documented CSS custom properties. Everything else is internal.

| Surface | Form | Notes |
|---|---|---|
| `<affect-kit-rater>`   | custom element | Interactive V/A pad + labels; emits `change` (per micro-update) and `commit` (on submit) |
| `<affect-kit-result>`  | custom element | Renders a committed `Rating` |
| `<affect-kit-compare>` | custom element | Two ratings or rating arrays side-by-side |
| `<affect-kit-face>`    | custom element | Standalone face glyph |
| `Rating`               | TS type        | Re-exported from each entry |
| `EmotionLabel`, `EmotionName` | TS types | Re-exported from each entry |
| `createRating`, `averageRatings` | functions | Re-exported helpers |
| CSS custom properties  | runtime        | `--affect-kit-{ink,paper,rule}`, `--affect-kit-color-{pink,gold,green,blue}`, `--affect-kit-font-size` |

### Per-entry exports

```jsonc
{
  ".":        "./dist/index.js",     // import 'affect-kit'         (all four registered)
  "./rater":  "./dist/rater.js",     // import 'affect-kit/rater'
  "./result": "./dist/result.js",    // import 'affect-kit/result'
  "./compare":"./dist/compare.js",   // import 'affect-kit/compare'
  "./face":   "./dist/face.js"       // import 'affect-kit/face'
}
```

`import { computeTarget } from 'affect-kit/core/face-renderer'` does not resolve. There is no path to internal symbols from outside the package.

## Encapsulation enforcement

1. **Resolver-level** — `package.json#exports` only lists the entries above.
2. **Bundle-level** — `core/`, `vocabulary/`, `styles/` are bundled into those entries by Vite library mode.
3. **Module-level** — `src/index.ts` re-exports only the public symbols. There is no `core/index.ts` barrel.
4. **Type-level** — internal symbols are tagged `/** @internal */`; `tsconfig.base.json` sets `stripInternal: true`.
5. **CI-level** — `@arethetypeswrong/cli` and `publint` validate the `exports` map matches what the build produces.

## Event model

The rater emits two events:

- **`change`** — fires on every micro-update (drag move, chip cycle). Use for live previews or VAD readouts.
- **`commit`** — fires only when the user submits via the "Done" button. Use for persistence.

The `Rating` payload on both events is identical in shape; only the cadence differs.

## `animate` semantics

All three display components default `animated=true`. The boolean attribute uses a custom Lit converter so raw HTML can opt out cleanly:

| Form | Result |
|---|---|
| `<affect-kit-face>` | animated |
| `<affect-kit-face animated>` | animated |
| `<affect-kit-face animated="true">` | animated |
| `<affect-kit-face animated="false">` | static |

`prefers-reduced-motion: reduce` is honored automatically. Reduced-motion users see a static face regardless of the prop. The rater's drag morphing is preserved (functional, not decorative); only breath, tremor, and chip-reorder FLIP are gated.

## Vocabulary

The 51-emotion vocabulary lives in `src/vocabulary/`. Each entry carries an NRC VAD coordinate. The vocabulary is **not** a consumer-configurable surface; the sort order and intensity ramps depend on the specific coordinate distribution.

See [`nrc-vad-validation.md`](nrc-vad-validation.md) for the validation pass that gates the 1.0 release.
