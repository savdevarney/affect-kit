# @affect-kit/react

React wrappers for [`affect-kit`](https://www.npmjs.com/package/affect-kit) web
components. Typed props, idiomatic event handlers, no manual `useEffect` boilerplate.

## Install

```bash
pnpm add affect-kit @affect-kit/react
# or: npm install affect-kit @affect-kit/react
```

## Use

```tsx
import { Rater, Result } from '@affect-kit/react';
import type { Rating } from '@affect-kit/react';
import { useState } from 'react';

export function App() {
  const [rating, setRating] = useState<Rating | null>(null);

  return (
    <>
      <Rater
        colorMode
        showVad
        onChange={(e) => setRating(e.detail)}
      />
      <Result rating={rating} showFace colorMode />
    </>
  );
}
```

## What you get

- **Typed props.** `colorMode`, `showFace`, `beforeLabel` etc. autocomplete
  with TS types. JSX recognises every component without module augmentation.
- **Idiomatic events.** `<Rater onChange={...} />` instead of refs +
  `addEventListener`. The handler receives a `CustomEvent<Rating>`.
- **Correct property handling.** Complex types like `rating: Rating | null`
  and `beforeRating: Rating | Rating[] | null` flow through as element
  properties (not attribute strings).
- **Refs work.** Want to call `.reset()` on the rater, or `.triggerShock()`
  on the face? Pass a ref like any React component.

```tsx
import { useRef } from 'react';
import { Rater } from '@affect-kit/react';
import type { AffectKitRater } from 'affect-kit/rater';

function MyApp() {
  const raterRef = useRef<AffectKitRater>(null);
  return (
    <>
      <Rater ref={raterRef} />
      <button onClick={() => raterRef.current?.reset()}>Reset</button>
    </>
  );
}
```

## Components

| React import | Underlying tag | Notes |
|---|---|---|
| `Rater` | `<affect-kit-rater>` | Emits `onChange` with `CustomEvent<Rating>` |
| `Result` | `<affect-kit-result>` | Pass `rating` as a prop |
| `Face` | `<affect-kit-face>` | Primitive — `v`, `a`, `animated` |
| `Compare` | `<affect-kit-compare>` | Pass `beforeRating` / `afterRating` |

## How it works

This package is a ~50-line wrapper built on
[`@lit/react`](https://www.npmjs.com/package/@lit/react). It registers each
custom element class with React's component system, declaring which
attributes are properties and which native `CustomEvent`s map to which
React-style `onXxx` handlers. The actual widget rendering still happens in
the underlying `affect-kit` web components — this package adds nothing to
the runtime payload beyond the wrapper bindings.

## License

MIT
