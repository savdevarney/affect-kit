# Longitudinal viz — what's deferred and why

This doc captures the design rationale for what affect-kit deliberately
*does not* ship at the package level today, and the conditions under which
those widgets / recipes might come back.

## Current position

affect-kit is a **logbook substrate, not a diagnostic.** The package
ships:

- `<affect-kit-rater>` — capture
- `<affect-kit-result>` — display a single rating (words + face + color)
- `<affect-kit-face>` — face primitive
- `<affect-kit-compare>` — paired side-by-side comparison
- `createRating()`, `averageRatings()` — helpers

That's it. Nothing in the package interprets a series of ratings or
makes claims about what a trajectory "means."

## What was retired

Earlier iterations shipped four longitudinal widgets in the playground
recipes folder:

- `<recipe-inertia>` — a "stuck — N sessions" headline plus a sparkline
  with stuck-zone shading
- `<recipe-resilience>` — recovery-arc bar chart with avg "check-ins to
  bounce back"
- `<recipe-range>` — a `pos / neutral / negative` strip plus VA scatter
- `<recipe-sparkline>` / `<recipe-scatter>` / `<recipe-cumulative>` —
  more neutral plotting primitives, but still implying the same
  interpretive frame

All four were removed. The first three because they layered
clinical-flavoured language onto V/A trajectories. The latter three were
honest visualisations but felt premature without a clearer design
position on what affect-kit is taking responsibility for.

## Why it's hard

Longitudinal interpretation of dimensional affect is genuinely unsettled
science:

- **Valence (V)** is the dimension users and researchers most reliably
  converge on as meaningful. There's broad agreement that sustained low
  V matters, that recovery from low V matters, that a wide V range matters.
  The exact thresholds, baselines, and integration windows are still
  debated, but the *direction of the gradient* is shared.
- **Arousal (A)** is widely captured but its longitudinal interpretation
  is more contested. Sustained high A reads differently in anxiety vs.
  excitement vs. flow contexts. Most ESM (experience-sampling) studies
  treat A as a covariate, not a primary outcome.
- **Dominance (D)** is in the original Mehrabian/Russell PAD model and
  in Bradley/Lang's stimulus norming, but very little longitudinal
  D-dynamics work exists. Most ESM studies drop D entirely. Saying
  anything authoritative about D trajectories would overclaim.

A second-order issue: the rater UI uses face / color / quadrants as
*affordances for label selection*, not as semantic claims about
quadrants. Treating them as semantic in the longitudinal view (e.g.
labelling the high-A / low-V quadrant as "anxious loop") imports
clinical meaning that the capture flow never asserted.

## Conditions for bringing them back

Future progress-tracking recipes for inertia / resilience / range
should:

1. **Anchor on valence first** (and possibly arousal) — not all three
   dimensions equally. V is where the science and the user's intuition
   converge; build there.
2. **Be parameterised, not prescriptive** — let the consumer set the
   threshold for "low V", the window length for "recent", the
   definition of "recovered". Defaults are fine; hard-coded headline
   labels are not.
3. **Live as recipes initially**, not as package widgets — until the
   defaults are validated against literature or by an academic
   collaboration, the right shape is "here's the math, here's a
   reference render, copy and adapt."
4. **Cite the floor of what's defended** — when a recipe references
   inertia (Kuppens et al. 2010), recovery (Ong et al. 2006), or
   variability (Gruber et al. 2013), say so in a comment. Keep the
   reading list current.
5. **Avoid composite "wellness scores"** — every score is a stack of
   judgement calls about which dimension matters more, what baseline
   to use, what direction is "good." Surface the underlying observables
   and let the consumer compose their own composite if they need one.

## Concrete next steps when ready

- Reach out to one or two emotion-dynamics labs (Kuppens lab in
  Leuven publishes ESM work openly and is a natural starting point)
  to discuss what consumers should compute.
- Sketch a V-only inertia recipe: "running variance of V over an
  N-session window, threshold-flagged" — the simplest defensible
  observable, fully parameterised.
- Sketch a V-only resilience recipe: "for each session crossing
  below threshold X, time-to-cross-back-above threshold Y" — also
  parameterised.
- Sketch a V/A range recipe: "convex hull area of (V, A) points
  over the last N sessions" — clean geometry, no zone naming.
- Pair each with a `<recipe-*>` reference render in `apps/site/recipes/`
  (when the site exists) or `apps/playground/src/recipes/` (now).

When any of these graduates from recipe to package widget, it earns
the move by having (a) a defended default, (b) a paper or two we point
to, and (c) a story for what the widget *doesn't* claim.
