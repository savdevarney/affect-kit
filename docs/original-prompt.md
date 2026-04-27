# affectkit — Claude Code prompt

Paste the prompt below into Claude Code (running in a directory containing the prototype HTML files plus the research and architecture docs) to begin the production port.

---

```
I've built an HTML/CSS/JS prototype of an emotion rating system that I want to 
convert to production-ready open-source web components using Lit, published as 
an npm package called `affectkit`.

The prototype and reference docs are in this directory:
- ./rater-final-v3.html         — interactive rater + live result panel preview
- ./result-panel.html           — standalone result panel demo
- ./affectkit-research.md       — affective science foundations, vocabulary, design principles
- ./affectkit-architecture.md   — component APIs, data flow, production requirements

Please read all four files first, in this order:
1. affectkit-research.md         (understand the why)
2. affectkit-architecture.md     (understand the what)
3. rater-final-v3.html           (understand the how, complex)
4. result-panel.html             (understand the how, simpler)

Then help me build the package.

═════════════════════════════════════════════════════════════════════
PACKAGE METADATA
═════════════════════════════════════════════════════════════════════

- Name: `affectkit`
- License: MIT
- Custom element prefix: `affectkit-`
- Components: <affectkit-rater>, <affectkit-result>, <affectkit-face>
- Built with: Lit + TypeScript
- Build tool: Vite
- Testing: Vitest (unit), Playwright (visual regression)
- Examples: Storybook (or Ladle if lighter weight is preferred)

First step: confirm `affectkit` is available on npm. If taken, fall back to 
`@yourorg/affectkit` (let me know and I'll create an org).

═════════════════════════════════════════════════════════════════════
COMPONENTS
═════════════════════════════════════════════════════════════════════

The architecture document specifies the API in detail. Summary:

<affectkit-rater>
  Props: color-mode (boolean), show-vad (boolean)
  Events: 'change' → CustomEvent<Rating> on every commit
  
<affectkit-result>
  Props: rating (Rating), show-face, show-labels, show-color, show-vad (booleans),
         align ('left'|'center'|'right'), variant ('default'|'compact'),
         animate (boolean — for breath only, no tremor in display)
  No events; pure display.
  
<affectkit-face>
  Props: v (number), a (number), animate (boolean)
  No events; pure display.

═════════════════════════════════════════════════════════════════════
THE RATING OBJECT
═════════════════════════════════════════════════════════════════════

interface Rating {
  v: number;           // -1..1, valence  (drives face + color)
  a: number;           // -1..1, arousal  (drives face + color)
  d: number;           // -1..1, dominance (analytical metadata)
  pad: { v: number; a: number };  // raw pad position before label aggregation
  fromLabels: boolean; // true if v/a came from label aggregation
  labels: { name: string; level: 1 | 2 | 3 }[];
  timestamp: number;   // ms since epoch
}

Pass the whole object as a single prop on the result component. Don't flatten 
it. React 19+ handles object props natively; older React can wrap.

Output Rating with full precision floats. Consumers round as needed.

Don't construct Rating in animation loops — only at commit time. The rater's 
own face during drag reads raw v/a state directly.

═════════════════════════════════════════════════════════════════════
EVENTS, NOT CALLBACKS
═════════════════════════════════════════════════════════════════════

All component output is via custom events ('change' on the rater). Works 
natively in every framework:

- Vanilla:    element.addEventListener('change', e => ...)
- Vue 3:      @change="handler"
- React 19:   onChange={handler}
- Svelte:     on:change={handler}
- Lit:        @change=${handler}

Don't use callback props. They're React-specific and awkward elsewhere.

═════════════════════════════════════════════════════════════════════
VOCABULARY (CRITICAL — INTERNAL ONLY)
═════════════════════════════════════════════════════════════════════

The emotion vocabulary lives INSIDE the package. There is no consumer-facing 
prop to override it. The whole rater design depends on V/A/D values being 
trustworthy.

Two tasks here:

1. The prototype uses approximate V/A/D values. For production v1.0, validate 
   every emotion against the NRC VAD Lexicon (Mohammad 2018, free for 
   commercial and research use). Mohammad's lexicon has 20,000+ English words; 
   the 56 in our default vocabulary should all be present. Document the source 
   in code comments.

2. Build the vocabulary as a typed constant. Future internationalization 
   happens via separate language exports (e.g., `affectkit/vocabulary/es`) 
   and a strict-enum `language` prop. Don't build i18n now, but design the 
   architecture to allow it.

═════════════════════════════════════════════════════════════════════
PRODUCTION REQUIREMENTS
═════════════════════════════════════════════════════════════════════

Detailed in affectkit-architecture.md. Top priorities:

1. **Accessibility**: keyboard-accessible face drag (arrow keys), ARIA roles 
   for the V/A pad and chips, screen reader announcements for state changes. 
   Research the right ARIA pattern — possibly role="slider" with aria-valuetext 
   describing position semantically.

2. **Reduced motion**: respect prefers-reduced-motion strictly. Disable tremor 
   and breath. Shorten functional transitions to 100ms. Keep face shape 
   morphing on drag (functional, not decorative).

3. **Multi-instance safety**: the prototype uses document.body for CSS custom 
   properties. Scope these to the component host instead. Multiple raters on 
   one page must work independently.

4. **SSR friendly**: components must not crash if document/window are 
   undefined at import time. Render placeholders during SSR; activate on 
   client mount.

5. **Touch / mobile**: pointer events already touch-compatible. Verify on 
   real iOS Safari and Android Chrome. Chips need 44×44 minimum tap target.

6. **Theming**: expose CSS custom properties:
   --affectkit-ink, --affectkit-paper, --affectkit-rule  (grayscale)
   --affectkit-color-pink, --affectkit-color-gold,
   --affectkit-color-green, --affectkit-color-blue       (V/A quadrants)
   --affectkit-font-display                              (level-3 serif accent)
   Font-family inherits from host by default.

7. **Bundling**: tree-shakeable ES modules, TypeScript types, single-component 
   imports possible (`import { AffectkitRater } from 'affectkit/rater'`), 
   optional CDN-friendly UMD bundle.

8. **Testing**: unit tests for color/face/VAD math, Playwright visual 
   regression at known V/A coords, integration tests for data flow, 
   accessibility tests for keyboard/screen reader.

═════════════════════════════════════════════════════════════════════
WHAT'S PRODUCTION-READY VS PROTOTYPE-ONLY
═════════════════════════════════════════════════════════════════════

PORT DIRECTLY (already production-quality):
- V/A → face shape math (computeTarget, eyePath, render)
- OKLab color blending + hue-aware darkening
- Surface-luminance-aware chip styling (--surface-is-light)
- Container queries for layout
- Em-based sizing
- Rating object schema and pub/sub pattern

CLEANUP BEFORE SHIPPING:
- Direct DOM manipulation → Lit reactive templates
- Inline event listeners with no cleanup → Lit lifecycle
- document.body CSS variables → host-scoped
- Global RAF loop → start/stop on connect/disconnect
- Approximate V/A/D values → NRC VAD validation
- No accessibility, no reduced-motion, no tests

═════════════════════════════════════════════════════════════════════
SUGGESTED COMMIT PLAN
═════════════════════════════════════════════════════════════════════

1. Initialize package (Lit + TS + Vite + Vitest + Playwright). Verify npm 
   name availability.

2. Extract pure modules from prototype as TypeScript with full unit tests:
   - core/face-renderer.ts  (computeTarget, eyePath, render)
   - core/color.ts          (OKLab math, colorForVA, darkening)
   - core/vad.ts            (computeVAD, Rating construction)
   - vocabulary/en.ts       (validated against NRC VAD)

3. Build <affectkit-face> first — simplest, validates architecture.

4. Build <affectkit-result> next — pure display.

5. Build <affectkit-rater> last — most complex.

6. Wire data flow. Demo page shows rater → result panel.

7. Accessibility pass.

8. Reduced-motion handling.

9. Multi-instance verification (two raters on one page).

10. Storybook with all prop combinations.

11. CI/CD: GitHub Actions, Changesets, npm publish.

12. Framework integration guides (vanilla, React 19, Vue 3, Svelte, Lit).

13. Vocabulary validation pass against NRC VAD.

═════════════════════════════════════════════════════════════════════
START HERE
═════════════════════════════════════════════════════════════════════

Please:

1. Read all four reference files (research, architecture, both prototypes).

2. Confirm `affectkit` is available on npm. Tell me the result.

3. Propose the directory structure and file layout for the package. Push 
   back if you see a better organization than what affectkit-architecture.md 
   suggests.

4. Propose the API for the shared face-renderer module (core/face-renderer.ts). 
   Particularly: how it accepts inputs (raw V/A vs Rating object), how it 
   handles animate vs static modes cleanly, how the SVG output is structured 
   for both interactive (rater) and display (result, face) contexts.

5. Wait for my approval before starting implementation. We'll iterate from 
   simplest to most complex (face → result → rater), with each component 
   fully tested and accessible before moving on.

The hard parts (visual design, perception math, data architecture) are all 
done. What remains is mechanical translation done with care, plus the 
discipline of making it actually production-grade. Take your time. Accuracy 
beats speed.
```
