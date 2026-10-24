// `affect-kit/pad` entry. Registers the pad + its internal face child
// as a side effect.
//
// Registration lives here (not on the class via `@customElement`) so the
// call is visible to consumer bundlers as an unambiguous side-effect
// expression. With `import 'affect-kit/pad'` (no binding), Vite/Rollup
// would otherwise tree-shake the chunk and skip element registration.

import { AffectKitPad } from './components/affect-kit-pad';
import { AffectKitFace } from './components/affect-kit-face';

if (!customElements.get('affect-kit-face')) customElements.define('affect-kit-face', AffectKitFace);
if (!customElements.get('affect-kit-pad'))  customElements.define('affect-kit-pad',  AffectKitPad);

export { AffectKitPad };
export type { PadPosition } from './components/affect-kit-pad';
export type { PadGlow, Theme } from './core/types';
