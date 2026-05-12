# playground

Local development host for hacking on the components in isolation. A single Vite dev server renders all four custom elements (`<affect-kit-rater>`, `<affect-kit-result>`, `<affect-kit-compare>`, `<affect-kit-face>`) with interactive control panels for every public prop — color-mode (`off` / `bg` / `words`), animation toggles, layout selects, label text inputs, and a live code snippet that mirrors the current state.

Edits to `packages/affect-kit/src` hot-reload here.

## Run

```bash
# from the repo root
pnpm --filter playground dev    # http://localhost:5173
```
