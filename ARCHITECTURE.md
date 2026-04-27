# Monorepo architecture

This document covers monorepo-level conventions. For the **package's** component APIs, data flow, and production requirements, see [`docs/architecture.md`](docs/architecture.md). For the **affective-science** foundations, see [`docs/research.md`](docs/research.md).

---

## Stack

| Concern | Choice | Why |
|---|---|---|
| Monorepo | [Turborepo](https://turbo.build) + [pnpm workspaces](https://pnpm.io/workspaces) | Light, fast, OSS-contributor-friendly. Matches the shape of [savdevarney's personal repo](https://github.com/savdevarney/savdevarney) |
| Package manager | pnpm 10+ | Strict workspace boundaries, fastest installs in CI |
| Component lib | [Lit](https://lit.dev) 3 + TypeScript | Web standards, framework-agnostic, smallest runtime |
| Build (lib) | [Vite](https://vitejs.dev) library mode | Multi-entry ESM bundle + sourcemaps; first-class TS |
| Tests | [Vitest](https://vitest.dev) (unit/integration) + [Playwright](https://playwright.dev) (visual) | ESM-native, parallel, no Jest legacy |
| Marketing site | [Astro](https://astro.build) on [Cloudflare Pages](https://pages.cloudflare.com) | First-class web-component story, zero JS by default, Markdown content collections |
| Versioning | [Changesets](https://github.com/changesets/changesets) | OSS-norm; PR-driven releases, public npm provenance |
| CI/CD | GitHub Actions | Lint + typecheck + tests on PR; Changesets-driven npm publish on merge |

---

## Package layout

```
packages/
  affect-kit/                       # the published npm package
    src/
      index.ts                      # public entry — re-exports + side-effect registration
      rater.ts  result.ts  face.ts  # per-component entries
      components/                   # Lit element classes
      core/                         # pure modules: face-renderer, color, vad, animation, types
      vocabulary/                   # internal: emotion list + types
      styles/                       # shared Lit CSS
    test/{unit,integration,visual}/
  tsconfig/                         # shared @affect-kit/tsconfig
  eslint-config/                    # shared @affect-kit/eslint-config

apps/
  site/                             # affectkit.com (Astro)
  playground/                       # local dev host (Vite)
  harness/                          # framework integration test harnesses
    vanilla/  react/  vue/  sveltekit/  angular/  nextjs/

docs/
  research.md  architecture.md  original-prompt.md  nrc-vad-validation.md
```

## Public API surface — what's exported

The published package exposes **only** the three custom elements, two TypeScript types, and the documented CSS custom properties. Everything else is internal.

### Exports map

The `package.json#exports` field is the resolver-level wall:

```jsonc
{
  ".":        "./dist/index.js",     // import 'affect-kit'
  "./rater":  "./dist/rater.js",     // import 'affect-kit/rater'
  "./result": "./dist/result.js",    // import 'affect-kit/result'
  "./face":   "./dist/face.js"       // import 'affect-kit/face'
}
```

`import { computeTarget } from 'affect-kit/core/face-renderer'` does not resolve. There is no path to internal symbols from outside the package.

### Public surface

| Surface | Form | API |
|---|---|---|
| `<affect-kit-rater>` | custom element | props: `color-mode`, `show-vad` · event: `change` |
| `<affect-kit-result>` | custom element | props: `rating`, `show-face`, `show-labels`, `show-color`, `show-vad`, `align`, `variant`, `animate` |
| `<affect-kit-face>` | custom element | props: `v`, `a`, `animate` |
| `Rating` | TS type | re-exported from each entry |
| `EmotionLabel` | TS type | re-exported from each entry |
| CSS custom properties | runtime | `--affect-kit-{ink,paper,rule}`, `--affect-kit-color-{pink,gold,green,blue}`, `--affect-kit-font-display` |

### Encapsulation enforcement (multi-layered)

1. **Resolver-level**: `package.json#exports` only lists the four entries above.
2. **Bundle-level**: `core/`, `vocabulary/`, `styles/` are bundled *into* those four entries by Vite library mode — never emitted as separate files in `dist/`.
3. **Module-level**: `src/index.ts` re-exports only the public symbols. There is no `core/index.ts` barrel.
4. **Type-level**: internal symbols are tagged `/** @internal */`; `tsconfig.base.json` sets `stripInternal: true`, deleting them from emitted `.d.ts`.
5. **CI-level**: `@arethetypeswrong/cli` and `publint` validate the `exports` map matches what the build produces.

## `animate` semantics

All three components default `animate=true`. The boolean attribute uses a custom Lit converter so raw HTML can opt out cleanly:

| Form | Result |
|---|---|
| `<affect-kit-face>` | animated |
| `<affect-kit-face animate>` | animated |
| `<affect-kit-face animate="true">` | animated |
| `<affect-kit-face animate="false">` | static |

`prefers-reduced-motion: reduce` is honored automatically — reduced-motion users see a static face regardless of the prop. The rater's drag morphing is preserved (functional, not decorative); only breath, tremor, and chip-reorder FLIP are gated.

## Versioning + releases

- One published package: `affect-kit`.
- All apps and dev-only packages (`tsconfig`, `eslint-config`) are listed under `ignore` in `.changeset/config.json` and don't need changesets.
- Pre-1.0 development uses `0.x.y` versions. v1.0 ships when the NRC VAD validation pass is complete.
- Releases are PR-driven via Changesets; the `release.yml` workflow handles `npm publish` on merge to `main`.

## Trunk-based development

Per [savdevarney's coding conventions](https://github.com/savdevarney/savdevarney-agent-config):

- Trunk-based, no long-lived branches.
- Branch for code changes; push directly to `main` only for docs/workspace files.
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`.
- No `Co-Authored-By:` lines.
