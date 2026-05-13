// `affect-kit/result` entry. Registers result + its internal face child.
// See rater.ts for the rationale behind explicit registration.

import { AffectKitResult } from './components/affect-kit-result';
import { AffectKitFace }   from './components/affect-kit-face';

if (!customElements.get('affect-kit-face'))   customElements.define('affect-kit-face',   AffectKitFace);
if (!customElements.get('affect-kit-result')) customElements.define('affect-kit-result', AffectKitResult);

export { AffectKitResult };
export type { ColorMode, Theme, Rating, EmotionLabel } from './core/types';
