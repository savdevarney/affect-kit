// `affect-kit/face` entry. Registers the custom element as a side effect.
// See rater.ts for the rationale behind explicit registration.

import { AffectKitFace } from './components/affect-kit-face';

if (!customElements.get('affect-kit-face')) {
  customElements.define('affect-kit-face', AffectKitFace);
}

export { AffectKitFace };
