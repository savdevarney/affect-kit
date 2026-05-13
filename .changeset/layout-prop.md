---
'affect-kit': minor
'@affect-kit/react': minor
---

New `layout` property on `<affect-kit-result>` and `<affect-kit-compare>` for consumers who want to force a stacked or side-by-side orientation regardless of available width.

```ts
layout: 'auto' | 'stack' | 'row'  // default 'auto'
```

| value | behavior |
|---|---|
| `'auto'` (default) | Container queries decide — stack at narrow widths, side-by-side when there's room. Existing behavior, no breaking change. |
| `'stack'` | Always stacked, even when there's horizontal room. Use this when the consumer wants a deliberate vertical reading order. |
| `'row'` | Side-by-side from a lower threshold than `'auto'` (240px on result, 320px on compare). Below the floor — where row would genuinely break — the component falls back to stacked rather than overflowing. |

On `<affect-kit-result>` this controls face-vs-words orientation. On `<affect-kit-compare>` it controls the left-vs-right halves arrangement.

```html
<!-- Always stacked, even on a wide page -->
<affect-kit-result layout="stack" show-face show-labels></affect-kit-result>

<!-- Insist on side-by-side comparison, accept stack only at extreme narrow -->
<affect-kit-compare layout="row" show-face></affect-kit-compare>
```

Playground gets a new `layout` segmented control on the result and compare cards.
