# affect-kit

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
