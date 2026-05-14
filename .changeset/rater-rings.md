---
'affect-kit': patch
'@affect-kit/react': patch
---

`<affect-kit-rater>` chip redesign: outward concentric rings encode intensity.

The chip-list now signals selection and level through a layered system:

- **Selection**: binary color flip. Unselected chips are a muted V/A tint (or faint ink in mono); selected chips at *any* level take the full V/A color (or solid ink in mono).
- **Level (1 / 2 / 3)**: concentric rings that radiate outward from the chip's edge into the surrounding chip-list margin — 1 ring for level 1, 2 rings for level 2, 3 rings for level 3. The chip's interior size never changes when its level changes, so the chip-list never reflows on click.

### Implementation notes

- The innermost ring is the chip's `border` (which always exists as a 2px transparent ring with `box-sizing: border-box` so chip dimensions stay constant; `border-color` flips to the ring color on selection).
- Additional rings (for levels 2 and 3) are stacked outward `box-shadow`s separated by gap masks using a new `--_surface` CSS variable (defaults to `--_paper`; overridden in `color-mode="background"` to the V/A pad color so the gaps blend invisibly with the colored surface).
- Mono ring color mixes `75% --_ink + 25% --_paper` — strong contrast against the surface the rings extend into, in both light and dark themes.
- Color-mode ring color mixes `50% V/A + 50% --_ink` (light) or `45% V/A + 55% --_paper` (dark) so rings appear as a darker shade of the chip's V/A hue.
- Hover lift is composed via a separate `--_chip-lift` CSS variable so it can layer with the ring stack without replacing it. Hover on selected chips also gets a stronger lift to keep the affordance visible.

### Outline ring on selected chips in color modes

Selected chips in `color-mode="background"` (where the chip's V/A color matches the rater pad's V/A wash) and `color-mode="words"` also get a thin outline in the same hue family but darkened, reinforcing the chip's boundary against the colored surface.

### Chip-list spacing

`gap` tightened to `14px 12px` so unselected chips sit close together; at level 3 the outward rings come within ~0.5px of touching adjacent selected chips' rings — conveys density without overlap.

### No public API changes

All changes are visual on the existing `<affect-kit-rater>` element. No new attributes or properties.
