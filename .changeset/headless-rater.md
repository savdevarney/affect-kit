---
'affect-kit': minor
---

The rater's behavior and motion in `affect-kit/core`, so a native rater moves and responds exactly as the web one does, and ratings no longer record a face nobody set.

**Breaking: `Rating.face` can be `null`.**
- **Why:** a face the person never set used to be saved as the centre, as if they had chosen it. A rating chosen with words only now has `face: null`.
- `createRating({ labels })` takes the face as optional.
- `averageRatings` averages only the faces that were set.
- `ratingPosition(rating)` gives one position for any rating: the face when set, otherwise the words' composite, with `source: 'face' | 'words'`.
- Ratings saved before always have a face, so they read the same.

**Motion, by time** (`affect-kit/core`):
- `smoothFaceParams(current, target, dtMs, { reducedMotion })`, `kickShock`, `decayShock`, `faceMotion(t, v, a, opts)`, `faceSettled` and `FACE_MOTION`.
- Every rate is per elapsed time, so the face moves the same at 60 and 120 Hz. At 60 Hz it matches 0.4's per-frame motion.
- **The idle breath is now 12 a minute.** It was about 5.3, inside the range breathing pacers use. Nothing on the face sways slower than 12 a minute either: the joyful tremor's slowest sway was about 8.5.
- **With Reduce Motion the face eases faster instead of snapping.** Breath, tremor, jitter and shock stop.

**The rater's behavior, as a reducer** (`affect-kit/core`):
- `createRater`, `raterReducer(state, event)`, `canFinish`, `raterRating`, `tapShocks`, `RATER_RULES`, `RATER_TIMING`, `RATER_LAYOUT` and `UNSET_FACE`.
- The events are `move`, `settle`, `adjust` (a screen-reader step), `showWords`, `tap`, `load` and `reset`. The renderer owns pointers and the dwell timer.
- `chipA11y(word, level)` reads a chip as a toggle: `{ label, selected }`.

**`<affect-kit-rater>`** now runs on that reducer:
- **Re-sort:** the words slide to their new order (320 ms) instead of jumping. With Reduce Motion they crossfade, and the rings appear without growing.
- **Before the first touch:** the face sits faded and still. It inks in on the first move.
- **Saving:** a face never touched is saved as `null`.
- **Keyboard and screen readers:** two adjustable values, "How pleasant" and "How energized", set the face, and a skip-link-style button goes straight to the words. The words are in `strings`.
- **Chips:** they're toggles (`aria-pressed`).
- **The dot under the finger:** ink at 35% (was 28%), or the chosen-word color on a face-colored surface.
- **Timings:** they come from `RATER_TIMING`.

**`<affect-kit-result>`:** a rating with no face shows its words only, with no mark where the face would be, and screen readers hear "Face, not set".

**`affect-kit/apple-health`:** `stateOfMind` takes the words' valence when the face wasn't set and says so in `valenceFrom`. It returns `null` for a rating with neither a face nor words.
