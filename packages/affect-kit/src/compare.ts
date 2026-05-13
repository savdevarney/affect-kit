// `affect-kit/compare` entry. Registers compare + the inner result + face
// (compare wraps two `<affect-kit-result>` instances, each rendering a face).
// See rater.ts for the rationale behind explicit registration.

import { AffectKitCompare } from './components/affect-kit-compare';
import { AffectKitResult }  from './components/affect-kit-result';
import { AffectKitFace }    from './components/affect-kit-face';

if (!customElements.get('affect-kit-face'))    customElements.define('affect-kit-face',    AffectKitFace);
if (!customElements.get('affect-kit-result'))  customElements.define('affect-kit-result',  AffectKitResult);
if (!customElements.get('affect-kit-compare')) customElements.define('affect-kit-compare', AffectKitCompare);

export { AffectKitCompare };
export type { ColorMode, Theme, Rating } from './core/types';
