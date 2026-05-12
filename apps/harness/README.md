# harness/

Framework integration test harnesses. Each subdirectory is a tiny app that imports `affect-kit` and renders the components, plus a Playwright spec asserting:

- The custom elements register and render
- The `change` / `commit` events fire with correctly-shaped `Rating` payloads
- SSR (where applicable) doesn't crash on import

These apps are **not deployed**. They're pinned harnesses run in CI.

| Dir | Validates | Status |
|---|---|---|
| `react/` | Vite + React 19 — object-prop passing, event mapping | ✓ wired |
| `vanilla/`, `vue/`, `sveltekit/`, `angular/`, `nextjs/` | bare-DOM, Vue 3, SvelteKit SSR, Angular 17+, Next.js App Router | planned |

The planned harnesses are intentionally not stubbed in the repo — they'll be added when each is genuinely wired up.
