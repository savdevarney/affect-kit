// `affect-kit/chip` entry. Registers the chip as a side effect.
//
// Registration lives here (not on the class via `@customElement`) so the
// call is visible to consumer bundlers as an unambiguous side-effect
// expression. With `import 'affect-kit/chip'` (no binding), Vite/Rollup
// would otherwise tree-shake the chunk and skip element registration.

import { AffectKitChip } from './components/affect-kit-chip';

if (!customElements.get('affect-kit-chip')) customElements.define('affect-kit-chip', AffectKitChip);

export { AffectKitChip };
export type { ChipColors, ChipLevel, ChipRing, ChipStyle } from './core/chip';
export type { Theme } from './core/types';
