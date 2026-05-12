// `affect-kit/rater` entry. Registers the rater + its internal face child
// as a side effect.
//
// Registration lives here (not on the class via `@customElement`) so the
// call is visible to consumer bundlers as an unambiguous side-effect
// expression. With `import 'affect-kit/rater'` (no binding), Vite/Rollup
// would otherwise tree-shake the chunk and skip element registration.

import { AffectKitRater } from './components/affect-kit-rater';
import { AffectKitFace }  from './components/affect-kit-face';

if (!customElements.get('affect-kit-face'))  customElements.define('affect-kit-face',  AffectKitFace);
if (!customElements.get('affect-kit-rater')) customElements.define('affect-kit-rater', AffectKitRater);

export { AffectKitRater };
export type { ColorMode, Rating, EmotionLabel } from './core/types';
