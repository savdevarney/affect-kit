---
'affect-kit': minor
---

A headless core, so a rater can be built natively, plus `<affect-kit-pad>` and `<affect-kit-chip>` for apps that build their own check-in from the pieces.

**`affect-kit/core`** is everything a rater needs to draw and behave like `<affect-kit-rater>`, as plain data and pure functions, with no custom elements and no DOM. It works in React Native, on servers and in web workers. The web components are built on it, so a native rater draws the same face, sorts the same words and paints the same colors.

- **The face:**
  - `faceParams(v, a)` gives the face's eleven numbers.
  - `facePaths(params)` and `faceGeometry(params)` give its paths, as SVG path data or as path commands.
  - `FACE_PARTS`, `FACE_STYLE`, `FACE_BOX` and `faceInk(theme)` say how to draw them.
- **Small faces:**
  - `faceTier(sizePx)` drops the crow's feet below 48 px and the nose below 28 px, and draws a dot in the face's color below 20 px.
  - `faceStroke(sizePx)` scales the strokes together below 48 px, so none renders under 1 px.
  - `<affect-kit-face>` applies both for its own size. From 48 px up it draws exactly as before.
- **The pad:**
  - `padToFace(x, y)` and `faceToPad(v, a)` convert between a touch and a face position.
  - `vaColor(v, a)` is the face's color, and `padColors(v, a, theme, glow)` gives the halo and the dot under the finger.
- **The words:** `wordOrder(v, a)` gives the 55 words nearest the face first, which is the rater's order. Ties keep vocabulary order, so every engine sorts the same.
- **Chips:**
  - `chipStyle(level, colors, basePx?)` gives a chip's look as plain data in px, from a base text size so the platform's text size can scale it. Rings sit outside the box; `bleed` says how far.
  - `WORD_LIST_GAP` is the space between chips in a list.
  - `neutralPalette(theme)` gives chips with no hue; `wordChipColors(v, a, theme)` gives a word its own color.
- **Color:** `surfacePalette(v, a, theme)`, `SURFACE_MIX` and `MIN_TEXT_CONTRAST`: the surface, text, chip and ring colors for a face position, matching `<affect-kit-rater color-mode="background">`. Every text color meets 4.5:1.
- **Accessibility:**
  - `describeFace(v, a)` gives a position in words.
  - `chipLabel(word, level)` gives a chip's name: "anxious, strongly".
  - `FACE_STEPS`, `nudgeFace` and `axisValueText` treat the face as two adjustable values, "How pleasant" and "How energized", for screen readers.
  - Every string comes from `A11Y_STRINGS_EN`; pass your own table to change it.
- **Worklets:** every function a frame calls starts with a `'worklet'` directive, so React Native Reanimated can run it on the UI thread. Elsewhere the directive does nothing.

Two more entries without a DOM:
- **`affect-kit/apple-health`:** `stateOfMind(rating, kind?)` is what to write to Apple Health's State of Mind: the kind, the face's valence, and Apple's labels for the words (`appleLabelsFor`, `APPLE_LABEL_OF_WORD`). A word maps only to Apple's label for the same word, or its plain adjective, never to a near one.
- **`affect-kit/fixtures`:** golden JSON of what the core gives for known inputs. Run a renderer against it in CI.

New elements:
- **`<affect-kit-pad>`** (`affect-kit/pad`): the rater's face pad alone.
  - Drag anywhere to move the face. It fires `input` while dragging and `change` on release, both with `{ v, a }`.
  - `glow="neutral"` draws the halo and dot in the ink (white on `theme="dark"`); `glow="none"` drops the halo.
- **`<affect-kit-chip>`** (`affect-kit/chip`): one emotion word as a pill with 1–3 intensity rings. It's colorless by default and has a `readonly` variant for result screens. The rater now draws its words with it.

`<affect-kit-rater>` now takes its chip and background colors from these helpers, which changes how it looks:
- Unselected chip text is picked by contrast. In `color-mode="background"` on pink and blue surfaces it was white at 2–3.5:1, and is now dark.
- With `theme="dark"`, selected chips and the button lift the V/A color instead of darkening it, as `color-mode="words"` already did.
- With no `color-mode`, unselected chip text is slightly darker, to reach 4.5:1.
- In `color-mode="words"`, selected chips pick their text color by contrast instead of from the pad's position.
- Colors follow `theme` changes, including the OS setting under `theme="auto"`.
- Screen readers hear a chip's level in words ("anxious, strongly") instead of "intensity 3 of 3".
