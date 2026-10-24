# affect-kit

Web components for dimensional emotion rating. Built with Lit, grounded in affective science.

- **Site + docs:** [affectkit.com](https://affectkit.com)
- **Source:** [github.com/savdevarney/affect-kit](https://github.com/savdevarney/affect-kit)
- **License:** MIT

## Install

```bash
npm install affect-kit
```

Requires Lit 3 as a peer dependency.

## Quick start

```html
<script type="module">
  import 'affect-kit/rater';
  import 'affect-kit/result';
</script>

<affect-kit-rater></affect-kit-rater>
<affect-kit-result show-face show-labels color-mode></affect-kit-result>

<script type="module">
  const rater  = document.querySelector('affect-kit-rater');
  const result = document.querySelector('affect-kit-result');
  rater.addEventListener('commit', (e) => { result.rating = e.detail; });
</script>
```

## Components

| Element | Role |
|---|---|
| `<affect-kit-rater>`   | Interactive V/A pad with emotion-label refinement. Fires `commit` with a `Rating`. |
| `<affect-kit-result>`  | Renders a committed `Rating` as face + dominant label + optional color chip. |
| `<affect-kit-compare>` | Two snapshots side-by-side, or two arrays of ratings averaged. |
| `<affect-kit-face>`    | Standalone face glyph driven by `v` and `a` props. |
| `<affect-kit-pad>`     | The rater's face pad alone, for apps that build their own word list. Fires `input` and `change` with `{ v, a }`. |
| `<affect-kit-chip>`    | One emotion word as a pill with 1-3 intensity rings. Colorless by default; `readonly` for result screens. |

Each ships as its own entry point (`affect-kit/rater`, `/result`, `/compare`, `/face`, `/pad`, `/chip`) and as a bundled side-effect import (`affect-kit`).

## The headless core

`affect-kit/core` is everything a rater needs to draw and behave like `<affect-kit-rater>`, as plain data and pure functions. It registers no elements and needs no DOM, so it works in React Native, on servers and in web workers. The web components are built on it, so a native rater draws the same face, sorts the same words and paints the same colors. The same names are also exported from `affect-kit`.

| Export | Role |
|---|---|
| `createRating`, `averageRatings`, `stripVad`, `rehydrate`, `ratingPosition` | Build, average, store and restore `Rating`s. A face with no words is valid, and so are words with no face (`face: null`). `ratingPosition` gives the face, or the words' position when there's no face. |
| `EMOTION_LABELS` | V/A/D coordinates for each of the 55 words. |
| `faceParams(v, a)`, `facePaths(params)`, `faceGeometry(params)` | The face as eleven numbers, then as SVG path data or path commands. Animate the numbers; rebuild the paths each frame. |
| `FACE_PARTS`, `FACE_STYLE`, `FACE_BOX`, `faceInk(theme)` | How to draw it: part order, strokes and fills in face units, the coordinate space, the default ink. |
| `faceTier(sizePx)`, `faceStroke(sizePx)` | Small faces: fewer parts below 48, 28 and 20 px, a dot below that, and strokes that never render under 1 px. |
| `padToFace(x, y)`, `faceToPad(v, a)`, `vaColor(v, a)`, `padColors(v, a, theme, glow)` | The pad: touch to position, the dot's place, the face's color, the halo and dot colors. |
| `smoothFaceParams`, `faceMotion`, `kickShock`, `decayShock`, `FACE_MOTION` | The face in motion, by elapsed time: easing, breath (12 a minute), tremor and shock. The same at any frame rate. |
| `createRater`, `raterReducer`, `canFinish`, `raterRating`, `RATER_TIMING`, `RATER_LAYOUT` | The rater's behavior as a reducer, with its timings and proportions. `<affect-kit-rater>` runs on it, so a native rater built on it behaves the same. |
| `wordOrder(v, a)` | The 55 words, nearest the face first: the rater's word order. |
| `chipStyle(level, colors, basePx?)`, `WORD_LIST_GAP` | A word chip's look as plain data in px, and the space between chips. |
| `surfacePalette(v, a, theme)`, `neutralPalette(theme)`, `wordChipColors(v, a, theme)` | Colors for a screen in the face's color, for chips with no hue, or for a word in its own color. Text meets `MIN_TEXT_CONTRAST` (4.5:1). |
| `describeFace(v, a)`, `chipLabel(word, level)`, `chipA11y(word, level)`, `nudgeFace(...)`, `axisValueText(...)`, `FACE_STEPS`, `A11Y_STRINGS_EN` | What screen readers hear, and the face as two adjustable values. Every string comes from a table you can replace. |

Everything a frame calls starts with a `'worklet'` directive, so React Native Reanimated can run it on the UI thread.

```ts
import { faceParams, facePaths, surfacePalette } from 'affect-kit/core';

const paths = facePaths(faceParams(-0.4, 0.5)); // draw with any renderer
const p = surfacePalette(-0.4, 0.5, 'light');
screen.style.background = p.surface;
caption.style.color = p.inkDim;
```

Two more entries, also without a DOM:
- **`affect-kit/apple-health`:** `stateOfMind(rating)` is what to write to Apple Health's State of Mind: the kind, the face's valence, and Apple's labels for the words. A word maps only to Apple's label for the same word, never to a near one.
- **`affect-kit/fixtures`:** golden JSON of what the core gives for known inputs. Run a renderer against it in CI, so a native rater and the web one fail together if they drift.

## How it works

Words are the measurement. The face sorts them. A pre-verbal gesture on the V/A pad orients you and re-sorts the NRC VAD lexicon so the closest words rise first. You refine by tapping the labels that fit. A single commit writes a structured `Rating`.

Full API reference, theming, and framework integration notes: [affectkit.com/docs](https://affectkit.com/docs).

## License

MIT © Savannah DeVarney
