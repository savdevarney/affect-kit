# harness/

Framework integration test harnesses. Each subdirectory is a tiny app that imports `affect-kit` and renders the rater + result, plus a Playwright spec asserting:

- The custom elements register and render
- The `change` event fires with a correctly-shaped `Rating` payload
- SSR (where applicable) doesn't crash on import

These apps are **not deployed**. They're pinned harnesses run in CI.

| Dir | Validates |
|---|---|
| `vanilla/` | Plain HTML — bare-DOM regressions |
| `react/` | Vite + React 19 — object-prop passing, event mapping |
| `vue/` | Vite + Vue 3 — `@change` handler, props |
| `sveltekit/` | SvelteKit — SSR placeholder + client hydration (highest-risk path) |
| `angular/` | Angular 17+ — `CUSTOM_ELEMENTS_SCHEMA`, binding semantics |
| `nextjs/` | Next.js App Router — `'use client'`, RSC boundary |

**Status:** placeholders. Initialize each with its respective `create` command in a follow-up commit.
