# affect-kit

Web components for dimensional emotion rating — built with Lit, grounded in affective science.

> **Status:** pre-release scaffold. The component implementations are not yet here. See [the monorepo root](https://github.com/savdevarney/affect-kit) for progress.

## Install

```bash
npm install affect-kit
```

## Quick start

```html
<script type="module">
  import 'affect-kit/rater';
  import 'affect-kit/result';
</script>

<affect-kit-rater></affect-kit-rater>
<affect-kit-result></affect-kit-result>

<script type="module">
  const rater = document.querySelector('affect-kit-rater');
  const panel = document.querySelector('affect-kit-result');
  rater.addEventListener('change', (e) => { panel.rating = e.detail; });
</script>
```

## Components

| Element | Role |
|---|---|
| `<affect-kit-rater>` | Interactive V/A pad with optional emotion-label refinement |
| `<affect-kit-result>` | Display panel for a captured rating |
| `<affect-kit-face>` | Reusable face glyph driven by `v` and `a` |

Full API, theming guide, and framework integration notes live at [affectkit.com](https://affectkit.com).

## License

MIT © Savannah DeVarney
