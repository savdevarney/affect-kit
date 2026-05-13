---
'affect-kit': patch
'@affect-kit/react': patch
---

Word display: highlighter pills + count-driven scale on `<affect-kit-result>` and `<affect-kit-compare>`.

### Highlighter pills

Each word in the result/compare display now sits in a soft tinted pill (rounded background tint), so sparse readouts feel deliberate rather than floating in space.

| color-mode | pill tone |
|---|---|
| `null` (mono) | `--_ink` at 11% alpha |
| `"words"` | the word's own V/A color at 11% alpha |
| `"background"` | `--_paper` at 55% alpha — a sticky-note highlight on the V/A wash |

Pill padding has a px floor (`max(0.18em, 0.35rem)` / `max(0.55em, 0.75rem)`) so level-1 (small) pills don't crowd their text at small font sizes.

### Count-driven scale

When fewer than 5 labels are present, the words container sets a `--_count-scale` CSS variable that multiplies the per-word font-size:

| label count | scale |
|---|---|
| 1 | 1.30× |
| 2 | 1.225× |
| 3 | 1.15× |
| 4 | 1.075× |
| 5+ | 1.0× (baseline) |

A solo `'grateful'` reads as a deliberate statement rather than a tiny fragment.

### Implementation notes

- Text opacity moved from the host element's `opacity` to a per-color `color-mix` alpha, so the pill background can keep its own (lower) alpha independent of text legibility.
- Words container `gap` tightened from `0.4em 1.5em` to `0.4em 0.6em` to suit the new pill rhythm.
- No public API changes — pure visual polish on the existing word display.
