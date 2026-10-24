---
'affect-kit': minor
---

`<affect-kit-rater>` takes `hide-submit`, for an app whose own screen has the button that moves on, and `chips-hint`, the line above the chips (an empty string hides it).

The rater emits `reveal` when the words first show, and takes its paper and ink from `--affect-kit-paper` and `--affect-kit-ink` when an app sets them, so it sits on the app's own page (the face follows `--affect-kit-ink` too).

A chip's ring gaps take `--affect-kit-paper` too, so the rings sit on the page.

The chips hint is `::part(hint)`, so an app can set its case, size and color.
