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

Each ships as its own entry point (`affect-kit/rater`, `/result`, `/compare`, `/face`) and as a bundled side-effect import (`affect-kit`).

## How it works

Words are the measurement. The face sorts them. A pre-verbal gesture on the V/A pad orients you and re-sorts the NRC VAD lexicon so the closest words rise first. You refine by tapping the labels that fit. A single commit writes a structured `Rating`.

Full API reference, theming, and framework integration notes: [affectkit.com/docs](https://affectkit.com/docs).

## License

MIT © Savannah DeVarney
