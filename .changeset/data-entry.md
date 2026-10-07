---
'affect-kit': minor
---

New `affect-kit/data` entry: the rating helpers and the vocabulary, with no custom elements and no DOM.

```ts
import { createRating, rehydrate, EMOTION_LABELS, type Rating } from 'affect-kit/data';
```

Every other entry registers custom elements when imported, and Lit's browser build needs `HTMLElement` at import time, so servers (Node, Cloudflare Workers, Deno) and web workers couldn't use `createRating`, `averageRatings`, `stripVad`, `rehydrate` or `EMOTION_LABELS` without a DOM shim. `affect-kit/data` exports exactly those, plus the `Rating`, `EmotionLabel` and `EmotionName` types. Nothing new is public; it's the same surface without the side effects.
