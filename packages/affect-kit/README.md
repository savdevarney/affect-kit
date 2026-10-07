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

## Helpers

`affect-kit/data` registers no elements and needs no DOM, so it works on servers, in web workers and in React Native. The same names are also exported from `affect-kit`.

| Export | Role |
|---|---|
| `createRating`, `averageRatings`, `stripVad`, `rehydrate` | Build, average, store and restore `Rating`s. A rating with a face and no labels is valid. |
| `EMOTION_LABELS` | V/A/D coordinates for each of the 55 labels. |
| `nearestLabels(v, a, n?)` | Labels ordered by distance from a face position: the rater's chip order. |
| `SYNONYMS_EN` | Everyday words mapped to labels (`stressed` → `overwhelmed`). |
| `completeLabels(prefix, v, a)` | Labels or synonyms starting with `prefix`, in face order. |
| `suggestLabels(text)` | Labels a text points at, each with a level (1-3) and a confidence. Skips negated words. Rules only: no model, no network. |
| `chipStyle(level, colors)` | A word chip's look as plain data (colors, rings, sizes), so native views can draw the same chip. |
| `neutralPalette(theme)`, `wordChipColors(v, a, theme)` | Colors for chips with no hue, or tinted by the word's own color. |
| `surfacePalette(v, a, theme)` | Surface, text and chip colors for a face position, matching the rater's `color-mode="background"`. Text meets `MIN_TEXT_CONTRAST` (4.5:1). |

```ts
import { surfacePalette, completeLabels } from 'affect-kit/data';

const p = surfacePalette(-0.4, 0.5, 'light');
screen.style.background = p.surface;
caption.style.color = p.inkDim;

completeLabels('stre', -0.4, 0.5); // [{ name: 'overwhelmed', synonym: 'stress' }]
```

## How it works

Words are the measurement. The face sorts them. A pre-verbal gesture on the V/A pad orients you and re-sorts the NRC VAD lexicon so the closest words rise first. You refine by tapping the labels that fit. A single commit writes a structured `Rating`.

Full API reference, theming, and framework integration notes: [affectkit.com/docs](https://affectkit.com/docs).

## License

MIT © Savannah DeVarney
