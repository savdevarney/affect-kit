---
'affect-kit': minor
---

New `affect-kit/text` entry: read a note for what it mentions, on the device, and fill the note's screen with it when the person taps Done. It needs no DOM and no network, and note text never leaves the device.

- **Bring your own classifier:** anything with `version` and `classify(text)`, returning candidates with the phrases that found them and near-misses with a reason (`'someone-else'`, `'past'`, `'negated'`, `'idiom'`, `'below-bar'`).
- **`phraseListClassifier({ version, lists, setAsides })`:** a classifier from phrase lists.
  - Each name gets whole-word anchor groups, scoring one per group, with a group's words spent once matched.
  - Exceptions (idioms, someone else's things) are taken out first, and so are set-asides ("work was fine").
  - The app brings the lists; the mechanics are the library's.
- **`cut(output, note, { suppressed, shippable })`:** the library's rule for what shows, whichever classifier ran.
  - Per kind, at most three, strongest first.
  - None of a kind when the cut falls on a tie.
  - Nothing for a note under four words.
  - A pair the person dismissed twice is dropped, while other phrases for the same name still count.
  - Everything is ranked first and then filtered to what may ship.
- **`heardReducer`:** the note's screen as a reducer, with the events `read`, `reread`, `keep`, `remove`, `add`, `raterClosed` and `withdraw`.
  - **Areas** come in kept, each with ✕.
  - **Feeling words** are offered dashed, at the base level, but only with `offerFeelings` and only when no words were chosen before the note.
  - **Never offered:** nothing under a crisis check, nothing once a hopeless-family word is chosen, and those words themselves never.
  - **Editing the note** keeps removed areas removed unless new words mention them, keeps hand-added ones, and leaves chosen words alone.
  - **Closing the rater** clears un-acted offers and stops new ones.
- **`literalMatch(word, note)`:** where a chosen word, or a form of it, appears in the note. Never a word that only means something like it.
- **`dismissalsAtSave`, `recordDismissals`, `suppressedPairs` and `suggestAgain`:** the person's dismissals, as pairs only, counted when the check-in is saved. An area added back by hand after its ✕ is neither a dismissal nor a removal.
- **`tallyCheckin`, `guardRate` and `overGuard`:** shown, removed and suppressed counts per day, list version and name, against a 1-in-20 guard. No person and no note text.
- **`HEARD_TIMING` and `heardSchedule`:** the moment the screen fills in.
  - Results arrive within 300 ms of Done.
  - The quote settles, then each phrase lights in reading order, 450 ms apart after a 300 ms pause.
  - Chips rise 8 px over 320 ms with no blur, and highlights fade over 500 ms.
  - Under Reduce Motion everything appears at once, with a 200 ms fade.
