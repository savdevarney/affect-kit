---
'affect-kit': minor
---

New `<affect-kit-pad>`, `<affect-kit-chip>` and helpers for apps that build their own word list around the face.

- **`<affect-kit-pad>`** (`affect-kit/pad`): the rater's face pad alone. Drag anywhere to move the face; it fires `input` while dragging and `change` on release, both with `{ v, a }`. `glow="neutral"` draws the halo and dot in the ink color (white on `theme="dark"`); `glow="none"` drops the halo.
- **`<affect-kit-chip>`** (`affect-kit/chip`): one emotion word as a pill with 1-3 intensity rings. Colorless by default; `readonly` for result screens. The rater now draws its words with it.
- **`chipStyle(level, colors)`**: a chip's look as plain data (colors, border, rings, sizes, `bleed`), so native views can draw the same chip. **`neutralPalette(theme)`** gives colors with no hue; **`wordChipColors(v, a, theme)`** gives a word's own tint.
- **`nearestLabels(v, a, n?)`**: labels ordered by distance from a face position. The rater now sorts its chips with it.
- **`SYNONYMS_EN`**: 96 everyday words mapped to labels (`stressed` → `overwhelmed`, `happy` → `joy`).
- **`completeLabels(prefix, v, a)`**: labels and synonyms starting with a prefix, in face order.
- **`suggestLabels(text)`**: the labels a text points at, each with a level (1-3) and a confidence (`'high'`, `'medium'`, `'low'`). Skips negated words; rules only, no model, no network. It can't find indirectly named feelings, and it reads "never been so frustrated" as a negation.
- **`surfacePalette(v, a, theme)`**, **`SURFACE_MIX`**, **`MIN_TEXT_CONTRAST`**: the surface, text, chip and ring colors for a face position. Every text color meets 4.5:1 against what it sits on.

All of the helpers are also in `affect-kit/data`, which needs no DOM.

`<affect-kit-rater>` now takes its chip and background colors from these helpers, which changes how it looks:

- Unselected chip text is picked by contrast. In `color-mode="background"` on pink and blue surfaces it was white at 2-3.5:1 and is now dark.
- With `theme="dark"`, selected chips and the button lift the V/A color instead of darkening it, as `color-mode="words"` already did.
- With no `color-mode`, unselected chip text is slightly darker, to reach 4.5:1.
- In `color-mode="words"`, selected chips pick their text color by contrast instead of from the pad's position.
- Colors follow `theme` changes, including the OS setting under `theme="auto"`.
