# affectkit — Architecture

This document specifies the component architecture, data flow, and production requirements for the affectkit package. It's the canonical reference for porting the prototype to production web components.

---

## Package overview

**Name:** `affectkit`
**Format:** Web Components built with Lit, published as ES modules on npm
**Custom element prefix:** `affectkit-`
**Target frameworks:** Vanilla, Vue 3, Svelte, Lit, Angular, React 19+ (with notes for older React)

### Components

Three custom elements:

1. **`<affectkit-rater>`** — interactive rating component
2. **`<affectkit-result>`** — display component for captured ratings
3. **`<affectkit-face>`** — face glyph (used internally; also exposed)

### Why three components, not one

The face glyph is reused across both interaction and display contexts. Exposing it as its own element lets consumers build custom layouts (e.g., a face icon in a header, a face on a timeline data point) without reimplementing the V/A → face math.

Result and rater are separate because they serve different roles:
- The rater is interactive and stateful — it owns the drag, chip selection, animation loop.
- The result is passive and stateless — it receives a Rating object and renders it.

Keeping them separate means the result component can be used independently — for example, displaying historical ratings on a timeline page where no rater exists.

---

## Component APIs

### `<affectkit-rater>`

The interactive rating component.

**Props (all primitive booleans for maximum framework compatibility):**

| Prop | Type | Default | Description |
|---|---|---|---|
| `color-mode` | boolean | false | Solid colored surface vs monochrome paper |
| `show-vad` | boolean | false | Debug-only VAD readout below chips |

**Events:**

| Event | Payload | When |
|---|---|---|
| `change` | `CustomEvent<Rating>` | On every commit (drag release, chip toggle) |

**Notes:**
- The rater never accepts a Rating object as input — it always starts fresh.
- For pre-fill behavior (rare), provide it via a method: `rater.setRating(rating)`.
- The vocabulary is internal — no consumer customization.

### `<affectkit-result>`

The display component for captured ratings.

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `rating` | `Rating` (object) | — | The captured rating to display. Required. |
| `show-face` | boolean | false | Render the face glyph |
| `show-labels` | boolean | true | Render the words list |
| `show-color` | boolean | false | Apply colored surface tint |
| `show-vad` | boolean | false | Debug-only VAD readout |
| `align` | `'left' \| 'center' \| 'right'` | 'center' | Word alignment |
| `variant` | `'default' \| 'compact'` | 'default' | Sizing preset |
| `animate` | boolean | false | Animate the face (breath; no tremor in static display) |

**Notes:**
- `show-face` + `show-labels` are independent. Hide labels for face-only display.
- Layout adapts via container query: side-by-side on wide panels, stacked on narrow.
- All sizing is em-based, inheriting from host font-size.

### `<affectkit-face>`

The face glyph, exposed for direct use.

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `v` | number, -1..1 | 0 | Valence |
| `a` | number, -1..1 | 0 | Arousal |
| `animate` | boolean | true | Breath + tremor animations |

**Notes:**
- Static (animate=false) is suitable for high-density displays (timeline dots, historical rows).
- Animated mode runs its own RAF loop, started in `connectedCallback`, stopped in `disconnectedCallback`.
- Multi-instance safe: each face is independent.

---

## The Rating object

The canonical data structure flowing between rater and result.

```typescript
interface Rating {
  // PRIMARY — drives visual rendering
  v: number;                    // -1..1, valence
  a: number;                    // -1..1, arousal
  
  // ANALYTICAL METADATA — preserved for downstream features
  d: number;                    // -1..1, dominance
  pad: { v: number; a: number }; // raw pad position before label aggregation
  fromLabels: boolean;          // true if v/a came from label aggregation
  
  // CONTENT
  labels: { name: string; level: 1 | 2 | 3 }[];
  
  // PROVENANCE
  timestamp: number;            // ms since epoch
}
```

### What each field is for

| Field | Used by | Role |
|---|---|---|
| `v`, `a` | face shape, color | Visual rendering of the rating |
| `d` | none currently | Analytical metadata; differentiates emotionally similar V/A states |
| `pad` | analytics | Gut placement before label aggregation; gut-vs-language gap is research signal |
| `fromLabels` | display logic | Whether V/A is the user's drag or computed from selected labels |
| `labels` | result panel words | Selected emotion words and their intensity |
| `timestamp` | storage, sorting | When the rating was committed |

### Why pass the whole object, not flat props

The Rating object is one cohesive captured moment, not a bag of fields. Splitting it into separate props (`v`, `a`, `labels`, `timestamp`...) would:

- Make consumers reconstruct the object on every render
- Force consumers to keep multiple props in sync
- Lose the type-checked guarantee that v/a/d are correlated

React 19+ handles object props natively. Older React versions can wrap with a small adapter component if needed.

### Don't construct Rating in animation loops

The rater's face during drag uses raw `currentVA.v` and `currentVA.a` directly — not a Rating object. Rating is only constructed at commit time (drag release, chip toggle). Allocating an object every animation frame would create unnecessary garbage collection pressure.

### Precision

Emit ratings with full float precision. Consumers round as needed for storage or display:

```js
// Bad — losing analytical resolution
const rating = { v: Math.round(rating.v * 100) / 100, ... };

// Good — emit full precision, round at display time
console.log(rating.v.toFixed(2)); // for human display
db.save(rating); // full precision for analytics
```

---

## Data flow

```
USER DRAG
    ↓
rater internal state (currentVA)
    ↓
[face renders continuously from currentVA in RAF loop]
    ↓
USER RELEASES OR TOGGLES CHIP
    ↓
rater builds Rating object (computeVAD aggregates labels if any)
    ↓
rater dispatches 'change' CustomEvent
    ↓
HOST APPLICATION receives event
    ↓
host stores Rating, passes to <affectkit-result rating={rating}>
    ↓
result component renders face + labels + (optional) VAD readout
```

### Two update channels in the result component

For consumers that want to show the result panel updating live (e.g., during the drag, not just on commit), the architecture supports it:

- `rating` prop drives the labels and discrete data — updates only when host re-renders.
- The face inside the result uses `<affectkit-face v={rating.v} a={rating.a} animate={false}>` which can be re-rendered with intermediate values during drag if the host wires it up.

In production, most consumers will only update the result on commit. The live-preview pattern is a UX choice for specific demo/onboarding contexts.

---

## Visual mapping reference

### V/A → face shape

The face renderer is a pure function: `computeTarget(v, a) → faceParams`.

Inputs:
- `v` ∈ [-1, 1] — valence
- `a` ∈ [-1, 1] — arousal

Output: face parameter object with brow positions, eye dimensions, mouth shape, crows feet opacity.

The four V/A quadrants produce distinct expressions:
- **Anger** (V<0, A>0): inner brow lowered, eyes narrow with asymmetric top, mouth flat-tight
- **Joy** (V>0, A>0): brow raised+lowered (Duchenne), eyes wide-arched, crows feet, mouth wide-up-corners
- **Calm** (V>0, A<0): brow at rest, eyes soft-arched (no crows feet), mouth gentle smile
- **Sad** (V<0, A<0): inner brow raised, eyes drooping, mouth corners down

Continuous interpolation through all four corners.

### V/A → color

```js
function colorForVA(v, a) → [r, g, b]
```

Implementation: bilinear interpolation in OKLab color space between four corner colors.

| Quadrant | V | A | Default color | Hex |
|---|---|---|---|---|
| Upper-left | -1 | +1 | Pink | #FF1457 |
| Upper-right | +1 | +1 | Gold | #FFC700 |
| Lower-right | +1 | -1 | Green | #1FE085 |
| Lower-left | -1 | -1 | Blue | #2D72F0 |

Intermediate positions blend smoothly through OKLab. Cyan emerges naturally at (V=0, A=-1) — bottom edge midpoint.

Customizable via CSS custom properties (see Theming).

### V/A → chip color (in color mode)

Selected chips share the user's current V/A color:

- `--user-r/g/b` — base user color (matches surface glow)
- `--user-l3-r/g/b` — darker variant for chip backgrounds (figure/ground separation)
- `--surface-is-light` — 0..1 indicator of surface luminance, drives unselected chip strategy

The darker variant scales OKLab L by 0.80–0.92 (hue-aware: yellow gets less darkening to avoid olive shift).

Unselected chips:
- On dark surfaces (pink, blue): subtle dark tint (default)
- On light surfaces (yellow, green): white tint that recedes into surface

Computed continuously so transitions are smooth across the V/A space.

---

## Theming

All visual customization happens via CSS custom properties.

### Grayscale / typography

```css
:root {
  --affectkit-ink: #1a1a1a;       /* primary text and ink */
  --affectkit-paper: #ffffff;      /* surface background */
  --affectkit-rule: rgba(0, 0, 0, 0.08); /* dividers */
  --affectkit-font-display: 'DM Serif Display', serif; /* level-3 word accent */
}
```

Other typography (level 1, level 2 chips, body text) inherits from host via `font-family: inherit`. Set the host's `font-family` and it cascades through.

### Color palette (V/A quadrants)

```css
:root {
  --affectkit-color-pink: #FF1457;   /* upper-left, anger */
  --affectkit-color-gold: #FFC700;   /* upper-right, joy */
  --affectkit-color-green: #1FE085;  /* lower-right, calm */
  --affectkit-color-blue: #2D72F0;   /* lower-left, sad */
}
```

The default palette is the result of careful work — perceptually balanced, OKLab-friendly, avoiding cyan at lower-left (semantic conflict in HRV contexts). Override with caution.

### Sizing

The result component is em-based throughout. Wrap it in a font-size to scale:

```html
<div style="font-size: 14px">
  <affectkit-result rating={rating}></affectkit-result>
</div>
```

Or via CSS:

```css
.compact-context affectkit-result {
  font-size: 13px;
}
```

The rater has fixed dimensions for now (drag interaction needs predictable sizes). Consider em-sizing the rater as a future enhancement.

---

## Production requirements

### Accessibility

**Keyboard navigation:**
- Face zone: arrow keys move the face on the V/A pad
  - Arrow: small step (e.g., 0.05 V/A units)
  - Shift+Arrow: larger step (e.g., 0.20 units)
  - Home/End: jump to corners
- Chips: Tab to focus, Enter/Space to cycle level
- Tab order: face → chips (in document order)

**ARIA:**
- Rater: `role="application"` or `role="group"` (research best pattern)
- Face zone: `role="slider"` with `aria-valuemin="-1"`, `aria-valuemax="1"`, `aria-valuetext` describing position semantically (e.g., "positive valence, activated arousal")
- Chips: `role="button"` with `aria-pressed` reflecting current level (treat level 0 as not pressed; otherwise pressed with level in name)

**Screen reader:**
- Announce face position changes after release (not on every drag pixel)
- Announce chip level changes immediately
- Announce VAD readout if shown
- Use `aria-live="polite"` regions for state changes

**Focus indicators:**
- Visible focus rings on chips and face zone
- Don't use `outline: none` without a replacement

### Reduced motion

Respect `prefers-reduced-motion: reduce` strictly:

- Disable tremor (high-arousal shake)
- Disable breath (always-present subtle motion)
- Disable chip reorder FLIP animation
- Shorten functional transitions (chip level changes, reveal) to 100ms
- Keep face shape morphing on drag (functional, not decorative)

```css
@media (prefers-reduced-motion: reduce) {
  /* disable animations */
}
```

In JS: check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` and gate animation loop accordingly.

### Multi-instance safety

The prototype uses `document.body` for CSS custom properties (`--user-r`, `--surface-is-light`, etc.). For multi-instance:

- All component-internal CSS variables must be scoped to the component's host element
- Use Lit's reactive style binding rather than direct `document.body.style.setProperty`
- Each rater has its own RAF loop, started/stopped via `connectedCallback`/`disconnectedCallback`
- Multiple raters on the same page must work independently (no shared state)

### SSR friendliness

- Components must not crash if `document` or `window` is undefined at import/construction time
- During SSR, render safe placeholders (e.g., a simple SVG of the face at V=0, A=0)
- Hydration on client mount activates animation and interaction
- Document framework-specific SSR notes:
  - Next.js: use `'use client'` directive on consuming components
  - SvelteKit: `client:load` on the affectkit elements
  - Astro: `client:visible` for performance

### Touch / mobile

The prototype uses pointer events which work on touch. For production:

- Verify on real iOS Safari and Android Chrome before release
- `touch-action: none` on face zone prevents page scroll during drag
- Chips need 44×44px minimum tap target (currently smaller — consider a `padding` boost on touch devices)
- Test the surface-is-light transition on lower-end Android devices (calc() with custom properties can be slow)

### Container query support

Result panel uses `container-type: inline-size` and `@container` queries. Browser support:

- Chrome/Edge 105+ (August 2022)
- Safari 16+ (September 2022)
- Firefox 110+ (February 2023)

For older browsers, the layout falls back to stacked. Document this.

### Bundling

- Tree-shakeable ES modules
- TypeScript types included in package
- Single-component imports possible:
  ```js
  import { AffectkitRater } from 'affectkit/rater';
  import { AffectkitResult } from 'affectkit/result';
  import { AffectkitFace } from 'affectkit/face';
  ```
- Optional CDN-friendly UMD bundle for vanilla HTML use
- No external CSS file — Lit handles styles internally

### Testing

Required test coverage:

**Unit tests:**
- Color math (OKLab conversions, hue-aware darkening, `--surface-is-light` calculation)
- VAD aggregation from labels (`computeVAD`)
- Face computeTarget logic at known V/A points (corners, center, midpoints)
- Rating object construction

**Visual regression (Playwright):**
- Face glyph at 9 known V/A coordinates (corners + edge midpoints + center)
- Result panel in all prop combinations (face/no-face × labels/no-labels × color/no-color × 3 alignments × 2 variants)
- Color mode chip styling at each V/A quadrant

**Integration:**
- Rater 'change' event payload shape
- Multi-instance: two raters operating independently
- Rater → result panel data flow

**Accessibility:**
- Keyboard navigation paths
- Screen reader announcements (with NVDA/VoiceOver if possible)
- Color contrast (WCAG AA) in both color and mono modes

---

## What's prototype-only vs production-ready

### Production-ready (port directly)

- V/A → face shape math (computeTarget, eyePath, render functions)
- OKLab color blending and hue-aware darkening logic
- Surface luminance detection for chip styling (`--surface-is-light`)
- Container queries for layout breakpoints
- Em-based sizing for host font inheritance
- ViewBox/feature coordinates and animation values
- The Rating object schema and pub/sub pattern
- Mono vs color mode strategies

### Prototype-only (cleanup before shipping)

- Direct DOM manipulation (`innerHTML`, `document.getElementById`) — replace with Lit reactive templates
- Inline event listeners with no cleanup — use Lit lifecycle
- Single-instance assumption (CSS variables on document.body) — scope to host
- Global RAF loop that runs even when not needed — start/stop on lifecycle
- Hard-coded English vocabulary with approximate V/A/D values — validate against NRC VAD Lexicon
- No accessibility beyond basic semantics
- No reduced-motion handling
- No internationalization architecture
- No tests

---

## Suggested directory structure

```
affectkit/
├── package.json
├── README.md
├── LICENSE                          # MIT recommended
├── src/
│   ├── index.ts                     # public exports
│   ├── components/
│   │   ├── rater.ts                 # <affectkit-rater>
│   │   ├── result.ts                # <affectkit-result>
│   │   └── face.ts                  # <affectkit-face>
│   ├── core/
│   │   ├── face-renderer.ts         # computeTarget, eyePath, render
│   │   ├── color.ts                 # OKLab math, colorForVA, darkening
│   │   ├── vad.ts                   # computeVAD, Rating construction
│   │   └── animation.ts             # tremor, breath, shock energy
│   ├── vocabulary/
│   │   ├── en.ts                    # default English vocabulary
│   │   └── types.ts                 # Emotion, Rating types
│   └── styles/
│       └── shared.ts                # shared Lit CSS for color logic
├── test/
│   ├── unit/
│   │   ├── color.test.ts
│   │   ├── face-renderer.test.ts
│   │   └── vad.test.ts
│   ├── integration/
│   │   └── data-flow.test.ts
│   └── visual/
│       ├── face-corners.spec.ts
│       └── result-variants.spec.ts
├── stories/                         # Storybook or Ladle
│   ├── rater.stories.ts
│   ├── result.stories.ts
│   └── face.stories.ts
└── docs/
    ├── research.md                  # this consolidated research doc
    ├── architecture.md              # this doc
    └── frameworks/                  # framework-specific integration guides
        ├── react.md
        ├── vue.md
        ├── svelte.md
        └── vanilla.md
```

---

## Suggested commit plan

1. **Lock in package metadata.** Initialize with Lit + TypeScript + Vite (dev), Vitest (unit), Playwright (visual), Storybook (examples).

2. **Extract pure modules.** Build `face-renderer.ts`, `color.ts`, `vad.ts`, `vocabulary/en.ts` as pure TypeScript with full unit tests. No Lit yet.

3. **Build `<affectkit-face>`.** Simplest component, validates the architecture. Static and animated modes.

4. **Build `<affectkit-result>`.** Pure display, no interaction. Takes Rating, renders face + words + optional VAD.

5. **Build `<affectkit-rater>`.** Most complex. Drag, chip selection, animation, FLIP reordering, color logic.

6. **Wire data flow.** Demo page shows rater 'change' event → result panel updating.

7. **Accessibility pass.** Keyboard, ARIA, screen reader, focus indicators.

8. **Reduced-motion handling.** All animations gated by media query.

9. **Multi-instance verification.** Demo with two raters operating independently.

10. **Storybook.** Cover all prop combinations.

11. **CI/CD.** GitHub Actions for tests + build + npm publish. Changesets for versioning.

12. **README + framework guides.** Vanilla, React 19, Vue 3, Svelte, Lit examples.

13. **Vocabulary validation.** Cross-reference all 56 emotions against NRC VAD Lexicon. Document sources. Mark this as v1.0 readiness criterion.

---

## Future considerations (post-v1)

- **Multilingual vocabularies.** NRC VAD has ~100 languages. Add via `affectkit/vocabulary/{lang}` exports plus `language` prop.
- **Custom face palettes.** Beyond CSS variables — possibly themed face renderers (more or less stylized).
- **Compact rater variant.** Small footprint for sidebars/widgets. Sub-200px square.
- **Timeline component.** Display many ratings as a 2D scatter or 3D scatter with V/A/time axes. Major work; deserves its own component.
- **Export utilities.** CSV/JSON export of Rating arrays in standard formats. Maybe `affectkit/export`.
- **Aggregations.** Helpers like `averageRating(ratings: Rating[])` for analytics dashboards. Pure functions, optional import.
