---
'affect-kit': minor
---

New `<affect-kit-pad>` and helpers for apps that build their own word list around the face.

- **`<affect-kit-pad>`** (`affect-kit/pad`): the rater's face pad alone. Drag anywhere to move the face; it fires `input` while dragging and `change` on release, both with `{ v, a }`. `glow="neutral"` draws the halo and dot in the ink color (white on `theme="dark"`); `glow="none"` drops the halo.
- **`nearestLabels(v, a, n?)`**: labels ordered by distance from a face position. The rater now sorts its chips with it.
- **`SYNONYMS_EN`**: 96 everyday words mapped to labels (`stressed` → `overwhelmed`, `happy` → `joy`).
- **`completeLabels(prefix, v, a)`** and **`labelsInText(text)`**: prefix search with synonyms, in face order, and the labels a piece of text names.
- **`surfacePalette(v, a, theme)`**, **`SURFACE_MIX`**, **`MIN_TEXT_CONTRAST`**: the surface, text and chip colors for a face position. Every text color meets 4.5:1 against what it sits on.

All of these are also in `affect-kit/data`, which needs no DOM.

`<affect-kit-rater color-mode="background">` now takes its colors from `surfacePalette`, which changes how it looks:

- Unselected chip text is picked by contrast. On pink and blue surfaces it was white at 2–3.5:1 and is now dark.
- With `theme="dark"`, selected chips and the button lift the V/A color instead of darkening it, as `color-mode="words"` already did.
- Colors follow `theme` changes, including the OS setting under `theme="auto"`.
