# Monorepo architecture

Monorepo-level conventions and the design rules behind the published package. The user-facing API reference lives at [**affectkit.com/docs**](https://affectkit.com/docs); the affective-science foundations live at [**affectkit.com/research**](https://affectkit.com/research).

---

## Stack

| Concern | Choice | Why |
|---|---|---|
| Monorepo | [Turborepo](https://turbo.build) + [pnpm workspaces](https://pnpm.io/workspaces) | Light, fast, OSS-contributor-friendly |
| Package manager | pnpm 10+ | Strict workspace boundaries, fastest installs in CI |
| Component lib | [Lit](https://lit.dev) 3 + TypeScript | Web standards, framework-agnostic, smallest runtime |
| Build (lib) | [Vite](https://vitejs.dev) library mode | Multi-entry ESM bundle + sourcemaps; first-class TS |
| Type bundling | [`dts-bundle-generator`](https://github.com/timocov/dts-bundle-generator) | One flat `.d.ts` per public entry; keeps `attw` clean |
| Tests | [Vitest](https://vitest.dev) (unit/integration) + [Playwright](https://playwright.dev) (visual) | ESM-native, parallel, no Jest legacy |
| Marketing site | [Astro](https://astro.build) | First-class web-component story, zero JS by default |
| Versioning | [Changesets](https://github.com/changesets/changesets) | OSS-norm; PR-driven releases, public npm provenance |
| CI/CD | GitHub Actions | Typecheck + build + tests + publint + attw on PR; Changesets-driven npm publish on merge |

## Repository layout

```
.
├── packages/
│   ├── affect-kit/                # the published npm package
│   │   src/
│   │     index.ts                 # public entry — re-exports + side-effect registration
│   │     rater.ts  result.ts  compare.ts  face.ts   # per-component entries
│   │     components/              # Lit element classes
│   │     core/                    # pure modules: face-renderer, color, vad, color-mode, types
│   │     vocabulary/              # internal: emotion list + types
│   │     styles/                  # shared Lit CSS
│   │   test/{unit,integration,visual}/
│   ├── react/                     # @affect-kit/react — typed React wrappers
│   ├── tsconfig/                  # shared @affect-kit/tsconfig
│   └── eslint-config/             # shared @affect-kit/eslint-config
├── apps/
│   ├── site/                      # affectkit.com (Astro, deploys to Cloudflare Pages)
│   ├── playground/                # local dev host (Vite) with full settings explorer
│   └── harness/                   # framework integration test harnesses (react/ is wired; more planned)
└── docs/
    └── longitudinal-future.md     # design rationale for retired widgets
```

## Public API surface — what's exported

The published package exposes **four custom elements**, a few TypeScript types, two helper functions, and a set of documented CSS custom properties. Everything else is internal.

### Per-entry exports map

The `package.json#exports` field is the resolver-level wall:

```jsonc
{
  ".":         "./dist/index.js",     // import 'affect-kit'         (registers all four)
  "./rater":   "./dist/rater.js",     // import 'affect-kit/rater'
  "./result":  "./dist/result.js",    // import 'affect-kit/result'
  "./compare": "./dist/compare.js",   // import 'affect-kit/compare'
  "./face":    "./dist/face.js"       // import 'affect-kit/face'
}
```

`import { computeTarget } from 'affect-kit/core/face-renderer'` does not resolve. There is no path to internal symbols from outside the package.

### Surface

| Surface | Form | Notes |
|---|---|---|
| `<affect-kit-rater>`   | custom element | Interactive V/A pad + label refinement. Emits `change` + `commit`. |
| `<affect-kit-result>`  | custom element | Renders a `Rating` as face + words + optional color. |
| `<affect-kit-compare>` | custom element | Two ratings or rating arrays side-by-side. |
| `<affect-kit-face>`    | custom element | Standalone face glyph driven by `v` + `a`. |
| `Rating`, `EmotionLabel`, `EmotionName`, `ColorMode` | TS types | Re-exported from each entry |
| `createRating`, `averageRatings` | functions | Re-exported helpers |
| CSS custom properties  | runtime | `--affect-kit-{ink,paper,rule}`, `--affect-kit-color-{pink,gold,green,blue}`, `--affect-kit-font-size` |

### Encapsulation enforcement (multi-layered)

1. **Resolver-level** — `package.json#exports` only lists the entries above.
2. **Bundle-level** — `core/`, `vocabulary/`, `styles/` are bundled *into* those entries by Vite library mode; never emitted as separate files in `dist/`.
3. **Module-level** — `src/index.ts` re-exports only the public symbols. There is no `core/index.ts` barrel.
4. **Type-level** — internal symbols are tagged `/** @internal */`; `dts-bundle-generator` emits one flat `.d.ts` per public entry with internal types inlined.
5. **CI-level** — [`publint`](https://github.com/bluwy/publint) + [`@arethetypeswrong/cli`](https://github.com/arethetypeswrong/arethetypeswrong.github.io) validate the `exports` map matches what the build produces (ESM-only profile).

## Event model

The rater emits two events. Both carry the same `CustomEvent<Rating>` payload shape; only the cadence differs.

- **`change`** — every micro-update (drag move, chip cycle). Use for live previews and VAD readouts.
- **`commit`** — the user explicitly submits via the *Done* button. Use this as the "I'm finished" signal for persistence rather than wiring to every intermediate `change`.

## `animated` semantics

All three display components default `animated=true`. The boolean attribute uses a custom Lit converter so raw HTML can opt out cleanly:

| Form | Result |
|---|---|
| `<affect-kit-face>` | animated |
| `<affect-kit-face animated>` | animated |
| `<affect-kit-face animated="true">` | animated |
| `<affect-kit-face animated="false">` | static |

`prefers-reduced-motion: reduce` is honored automatically — reduced-motion users see a static face regardless of the prop. The rater's drag morphing is preserved (functional, not decorative); only breath, tremor, and chip-reorder FLIP are gated.

## `color-mode` semantics

`color-mode` is a string enum (`'background' | 'words' | null`). For backwards compatibility, the legacy boolean attribute form (`<el color-mode>`) maps to `'background'`. See `core/color-mode.ts` for the shared Lit converter.

## Vocabulary

The 51-emotion English vocabulary in `src/vocabulary/en.ts` is sourced from the **NRC VAD Lexicon v2.1** (Mohammad 2025). Every entry's V/A/D coordinates are direct from the lexicon, scaled to `[-1, 1]`. The vocabulary is **not** a consumer-configurable surface — sort order and intensity ramps depend on the specific coordinate distribution.

## Versioning + releases

- One published package: `affect-kit`. The `@affect-kit/react` wrapper publishes separately.
- All apps and dev-only packages (`tsconfig`, `eslint-config`) are listed under `ignore` in `.changeset/config.json` and don't need changesets.
- Pre-1.0 development uses `0.x.y` versions.
- Releases are PR-driven via [Changesets](https://github.com/changesets/changesets). The `release.yml` workflow handles `npm publish` on merge to `main` with [provenance](https://docs.npmjs.com/generating-provenance-statements).

## Trunk-based development

- Trunk-based, no long-lived branches.
- Branch for code changes; push directly to `main` only for docs/workspace files.
- Commit subject style: short, lowercase, scope-prefixed (`rater: ...`, `docs: ...`). No `Co-Authored-By:` lines.
