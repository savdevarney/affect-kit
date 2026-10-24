---
'affect-kit': minor
---

Chip intensity reads the same in every palette: one ring per level, each outside the chip, separated by a gap of the surface.

- Level 1 now has a ring of its own. It used to be marked only by the chip's border, which on a colorless chip (`neutralPalette`) was nearly invisible, so levels read as 0, 1, 2.
- The border is the fill's color when selected and transparent at rest. Size never changes, and the border is never read as a ring.
- Rings, nearest first: gap 1.25 px then ring 1.5 px (level 1), then 1.25 + 1.25 (level 2), then 1.25 + 1 (level 3). `bleed` is 2.75, 5.25 or 7.5 px.
- `WORD_LIST_GAP` is 16 × 16 px, up from 14 × 12, to clear two level-3 chips side by side.
