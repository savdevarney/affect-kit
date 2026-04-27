# affectkit — Research foundations

This document consolidates the affective science research, design principles, vocabulary sourcing, and longitudinal tracking research that grounds affectkit. It's intended as the canonical research reference for the open-source package.

---

## Part 1: The dimensional model of affect

### Why dimensions, not categories

Discrete-emotion theories (Ekman's six "basic emotions": anger, disgust, fear, happiness, sadness, surprise) have long been challenged by dimensional theories that treat affect as continuous in a small number of dimensions. Russell's circumplex model (Russell, 1980) and Mehrabian & Russell's PAD/VAD model (1974, 1980) propose that any emotional state can be located in a continuous space defined by:

- **Valence (V)** — pleasantness. How positive or negative the experience is.
- **Arousal (A)** — activation. How energized or calm.
- **Dominance (D)** — control. The degree of agency or sense of being in control.

The dimensional approach has accumulated substantial evidence:

- Posner et al. (2005) show that PET and fMRI studies map emotional experience onto valence and arousal axes more cleanly than onto discrete categories.
- Lindquist et al. (2012) found that "basic emotion" categories don't have consistent neural signatures, while valence and arousal do.
- Barrett (2017), in *How Emotions Are Made*, argues that emotions are constructed from core affect (valence × arousal) plus conceptual knowledge — strong support for treating dimensions as primary and labels as secondary.

**Implication for affectkit:** the V/A pad is the primary input. Labels are a secondary refinement layer. This matches how affect is actually constructed: feeling first, naming second.

### Why include dominance even though it's not visualized

Two emotions can share V and A but differ in D meaningfully:

- *Frustrated* (V=−0.5, A=+0.5, D=+0.3) — negative, activated, agentic. You're angry but you feel capable of acting.
- *Anxious* (V=−0.5, A=+0.5, D=−0.3) — negative, activated, helpless. You're worried but feel things happening to you.

These have very different clinical implications:

- **Therapeutic significance**: high-D negative states call for assertion/boundary skills; low-D negative states call for containment/grounding.
- **Longitudinal patterns**: chronic low-D states correlate with depression and learned helplessness; chronic high-D negative states with anger management challenges.
- **Research export**: VAD is the standard export format in affective science, so any data flowing out for clinical or research purposes needs all three dimensions.

The face glyph and color visualization use V and A only because those are the dimensions a face naturally communicates. Dominance is preserved in the Rating object as analytical metadata for downstream use.

### What V/A maps to in the face

The face glyph uses Facial Action Coding System (FACS, Ekman & Friesen 1978) action units to encode V and A:

| Action Unit | What it does | Driven by |
|---|---|---|
| AU 1+2 (inner+outer brow raiser) | Surprise/sad brow lift | Sadness (negative V × negative A) |
| AU 4 (brow lowerer) | Frowning, anger furrow | Anger (negative V × positive A) |
| AU 6 (cheek raiser) | Crows feet, Duchenne smile | Joy (positive V × positive A) |
| AU 12 (lip corner puller) | Smile | Joy + general positive V |
| AU 15 (lip corner depressor) | Down-turned mouth | Sadness, all negative V |
| Eye openness | Wide vs narrow | Arousal (positive A = wider) |
| Mouth openness | Open vs closed | Arousal (positive A = open) |

**Why these specific AUs:** they're the most cross-culturally consistent (Cordaro et al., 2018, in 17 cultures) and the most reliable for non-expert recognition. Subtle AUs like nostril dilation or lip pressing aren't included because they're harder to render at small size and don't add discrimination at the V/A level.

**Calm vs joy distinction:** the face uses the soft-arch eye for "calm" (positive V, negative A) and the full Duchenne arch (with crows feet) for "joy" (positive V, positive A). Crows feet only appear in big smiles — orbicularis oculi contracts only with high-intensity positive affect. This anatomical accuracy matters for cross-cultural recognition.

### Why a reductive face glyph

The face is intentionally minimal: black ink linework, no skin tone, no eye whites, no body. This is by design:

1. **Cultural neutrality.** Skin color, hair, and facial structure encode race and ethnicity. Removing them removes that load.
2. **Universality.** The features are a graph of relationships (brows above eyes, mouth below) rather than a portrait.
3. **Self-projection.** A non-photorealistic face is easier to project onto. Users see "their" feeling, not a depicted person's feeling.
4. **Research-aligned.** Schematic faces (Aviezer et al., 2008) are recognized as well as photographs at the V/A level.

---

## Part 2: Vocabulary — emotion words and their coordinates

### Sources for V/A/D values

The default vocabulary in affectkit draws V/A/D coordinates from established norms:

**Primary source: NRC Valence-Arousal-Dominance Lexicon (Mohammad, 2018)**
- 20,000+ English words with V/A/D ratings
- Free for research and commercial use
- Crowd-sourced ratings from native English speakers
- Published values normalized to 0..1 (rescale to −1..1 for affectkit)
- Multilingual extensions cover ~100 languages

**Secondary source: Warriner et al. (2013) ANEW Extension**
- 13,915 English words with V/A ratings (no D)
- 4-decimal precision, large sample sizes
- Free for research use; check commercial license
- Useful cross-reference for NRC values

**Tertiary source: Bradley & Lang (1999) ANEW Norms**
- Original Affective Norms for English Words
- 1,034 words, comprehensive V/A/D
- Smaller but high-quality dataset

### Vocabulary curation principles

The default 56-emotion vocabulary in affectkit follows these principles:

1. **Coverage**: span all four V/A quadrants reasonably evenly. Avoid the common bias toward negative-emotion words (which dominate clinical vocabularies).

2. **Gradation**: include emotions of varying intensity within each quadrant. *Content* and *ecstatic* are both positive-valence-positive-arousal but at different intensities.

3. **Single-word**: prefer single words over phrases. "Overwhelmed" not "feeling overwhelmed." Compactness matters for chip rendering.

4. **Common-language**: prefer everyday words over clinical/academic terms. "Sad" not "dysphoric."

5. **Specificity**: avoid words that are highly context-dependent. "Triggered" means very different things across communities.

6. **Avoid moral loading**: skip words that imply moral judgment. "Resentful" is OK (an emotion); "sinful" is not (a moral category).

### Emotion granularity research

Research by Lisa Feldman Barrett and colleagues (Kashdan, Barrett, McKnight, 2015) established that **emotional granularity** — the ability to make fine-grained distinctions between similar emotions — predicts mental health outcomes:

- Higher granularity correlates with lower psychopathology
- Lower granularity correlates with depression, anxiety, eating disorders, alcohol abuse
- Granularity can be developed through practice (effectively what affectkit's drag-then-tag flow trains)

The intensity levels (1/2/3) on chips are themselves a granularity affordance. A user who selects only level-3 chips is treating each emotion as binary; a user who uses all three levels is making finer distinctions.

The Rating object preserves both the raw pad position (`pad`) and the label-aggregated V/A. The difference between them is itself a granularity signal — large gaps suggest the user's gut feeling and verbal labeling diverge, which research links to alexithymia and lower well-being.

### Why no vocabulary customization API

The vocabulary is internal to the package. Consumers cannot pass custom emotions via props. Reasons:

1. **Trust**: the rater's whole logic depends on V/A/D values being trustworthy. Arbitrary user words break that trust silently.
2. **Calibration**: V/A/D values for a word are not opinions — they're empirical norms validated by research. Letting consumers override them is a category mistake.
3. **Internationalization should be principled**: if/when other languages are added, they're sourced from validated multilingual lexicons (NRC has them for ~100 languages), not user-provided.

Future internationalization happens via separate exports (`import vocabulary from 'affectkit/vocabulary/es'`) selected by a strict-enum `language` prop, not free-form data.

---

## Part 3: Design principles

### Rate-then-refine: the interaction model

The fundamental flow of the rater is:

1. **Drag the face on the V/A pad** — this is the primary, pre-verbal rating. Users place their gut feeling somewhere in the V/A space without needing to articulate it.

2. **Refine with labels** — after committing the pad position, optional labels appear, sorted by relevance to the current V/A position. Users tap labels to add nuance, cycling through three intensity levels.

This sequence respects how affect actually works:
- Feeling precedes naming (Damasio, 1999; Barrett, 2017)
- Pre-verbal somatic awareness is more accurate for in-the-moment state than verbal label-matching (Mehling et al., 2012)
- Labeling emotions reduces their intensity ("affect labeling," Lieberman et al., 2007), so labeling AFTER initial assessment avoids contaminating the rating

The face on the pad provides immediate visual feedback that the rating has been received. The face's expression is itself a small mirror of the user's state — a nonjudgmental reflection.

### Why monochrome-by-default in clinical/wellness contexts

In contexts where affectkit is a supporting instrument (e.g., paired with a primary intervention), it should default to monochrome. Reasons:

1. **Don't compete with the primary signal**. If the host product has its own color identity (e.g., HRV biofeedback with a green=good, red=bad palette), the rater introducing a separate color system creates visual noise.

2. **Don't moralize the state**. Color carries emotional valence. A bright red surface for negative emotions reads as "bad." Monochrome lets the user have a state without being told it's good or bad.

3. **Reduces visual stimulation for activated states**. A user in a high-arousal anxious state doesn't benefit from a vibrant red surface that further activates them.

The color toggle exists for standalone use cases (publication, journaling, social sharing) where the color *is* the point — making the rating shareable and visually expressive.

### When color is appropriate

Color mode is appropriate when:

- The rating is the primary action (not a wrapper around something else)
- The user opts into color (not forced)
- The output is intended to be shared or published (where visual differentiation matters)
- Long-term tracking views where pattern recognition benefits from color coding

Color mode is inappropriate when:

- The rating is a supporting check-in around a separate intervention
- The user is in clinical distress (color amplifies state)
- The product's visual identity owns the color space

### The four-quadrant color palette

The V/A pad has four corner colors:

- **Upper-left (negative V, positive A)**: Pink/magenta — anger, frustration, agitation
- **Upper-right (positive V, positive A)**: Gold/yellow — joy, excitement, enthusiasm
- **Lower-right (positive V, negative A)**: Green — calm, content, peaceful
- **Lower-left (negative V, negative A)**: Blue — sad, lonely, defeated

Color choices follow several principles:

1. **Cyan reserved for biofeedback domains**. Avoid placing pure cyan at the lower-left because in HRV/biofeedback contexts cyan means "high coherence" — semantic conflict with sadness. Pure cyan emerges naturally as the bottom-edge midpoint (neutral V, fully calm), which is the correct semantic location.

2. **Cross-cultural conventions**. Red/pink for anger, gold for joy, green for calm, blue for sad align with cross-cultural color associations (Adams & Osgood, 1973; Hupka et al., 1997) — not perfect universals, but the most common patterns.

3. **OKLab interpolation**. Colors blend in OKLab color space (Ottosson, 2020) rather than HSL. OKLab is perceptually uniform, so V/A positions blend smoothly without the hue-flip artifacts HSL produces at quadrant interiors.

### Figure/ground separation in color mode

The hardest visual problem in color mode: when the surface is tinted with the user's V/A color and the chips are also that color, chip edges disappear. Solutions:

1. **Darker chip variant via OKLab L scaling**: chips use a darker variant of the user color (L × 0.80 base), so chips are perceptibly more saturated than the surface tint.

2. **Hue-aware darkening**: yellow has a narrow luminance band — darkening pure yellow turns it olive. The lScale factor adapts: 0.80 for most hues, up to 0.92 for pure yellow. Detected via OKLab b-channel positivity with a-channel suppression for mixed hues.

3. **Surface-luminance-aware unselected chips**: on light surfaces (yellow, green), unselected chips become white-tinted so they recede into the surface, letting selected chips pop. On dark surfaces (pink, blue), unselected chips stay dark-tinted because there's already plenty of contrast. Smooth interpolation via `--surface-is-light` CSS variable.

4. **Drop shadows with intensity scaling**: level 1 chips get a subtle shadow; level 3 chips get a pronounced shadow. The shadow is "selection lift" feedback — the more committed your selection, the more it lifts off the surface.

### Animation principles

The face on the rater is alive but not theatrical:

- **Always-present breath**: subtle vertical translation at ~0.55 Hz, amplitude ~0.5 viewBox units. Conveys "this is a face that is alive" without being distracting.

- **V-driven cohesion vs chaos**: at high arousal with negative valence (anger zone), features tremor. At high arousal with positive valence (joy), features are stable but bouncy. Calm states are still and held.

- **Anger tremor calibration**: max chaos amplitude ~2.8 units (group) and 0.7 units (individual). Earlier iterations were too violent — the rule is "out of control but still a face." The face should remain readable as a face throughout.

- **Shock energy on chip selection**: when a user toggles a high-arousal label on, the face gets a brief burst of additional motion. Reinforces the connection between the label and the face's expression.

**Reduced motion**: respect `prefers-reduced-motion: reduce` strictly. Disable tremor and breath. Keep functional transitions (chip level changes, reveal) but shorten to 100ms. Drag morphing stays (it's functional, not decorative).

### Face spacing for mobile

On mobile/stacked layouts, the face must not crowd out the labels. Specific decisions:

- ViewBox tightened to `-85 -85 170 170` (from a looser default) — features fill ~60% of canvas instead of 45%.
- Face zone vertical margins reduced to 8px (from 16px) on mobile.
- Chips zone top padding reduced to 4px (from 8px).
- Face SVG fills 90% of zone (from 82%).

Combined effect: ~25% less vertical space used by face area on mobile, ensuring users see actual labels above the fold without scrolling.

---

## Part 4: Longitudinal tracking — research foundations

### What progress means for emotional self-rating

Tracking emotion ratings over time is valuable but easy to do wrong. The wrong way: aggregate ratings into a single "wellness score." The right way: surface multiple parallel signals that the user can interpret with appropriate context.

Key research findings:

- **Emotion has no monotonic "improvement" direction** (Davis, Gross & Ochsner, 2011). Feeling more negative emotion isn't worse if it's contextually appropriate. Feeling positive emotion isn't always better.

- **Emotional flexibility predicts wellbeing better than emotional positivity** (Kashdan & Rottenberg, 2010). Users who can access a range of emotions, including negative ones, do better than users stuck in positive-only states.

- **Granularity is itself trackable** (Barrett et al., 2001). Users developing finer emotional distinctions show measurable improvements over time. The number of distinct emotion words they use, and the distribution of their V/A positions, are signal.

- **Pattern interruption matters more than averages** (Bolger, Davis, Rafaeli, 2003). Sudden shifts in emotion patterns — week-over-week changes — carry more clinical information than long-term averages.

### What to surface, what not to surface

Surface to the user:

- **V/A trajectory over time**: a 2D scatterplot or trail showing where ratings cluster. Shows preferred regions and outliers without judging them.
- **Granularity**: number of distinct emotions used, distribution across V/A space. Improving granularity is unambiguously good.
- **Frequency of self-rating**: did the user check in today/this week? More check-ins = more self-awareness practice.
- **Pattern shifts**: "this week your ratings cluster differently than last week."

Don't surface:

- **A single wellness score**. Aggregating V/A into one number loses information and invites users to optimize the wrong target.
- **Emotion improvement implications** ("you used to feel sad more often!"). Implies feeling sad is bad.
- **Comparison to "normal" or other users' data**. Affect is contextual; comparison induces dysmorphia.

### HRV + affect: parallel, not combined

In contexts where affectkit is paired with HRV biofeedback (the original Varia integration use case), the two signals must be tracked in parallel and never combined into a single score:

- HRV is physiological (autonomic state) — measurable, has objective normal ranges
- Affect is phenomenological (felt experience) — subjective, no normal ranges

A user might have low HRV (physiologically activated) and report calm affect. That's not an error — it's interesting data. Combining them into a "stress score" loses this nuance.

Show them as two separate timelines that share an x-axis. Let users see the divergences themselves.

### Threshold design for pattern detection

When the system detects patterns, the thresholds should be:

- **Stuck-low**: 7+ consecutive days with V < −0.3 average. Not a single bad day.
- **High-plateau**: 14+ days with consistent A > +0.5 (chronic activation/stress).
- **Bounce-back**: V trajectory crossing from negative-2-week-avg to positive within a week. Worth celebrating.
- **Granularity gain**: distinct emotion count up by 30%+ over previous month.

Thresholds need real user data to validate. Document them as "v1 estimates pending real-world calibration" — don't ship false certainty.

### Privacy is non-negotiable for emotion data

Affect ratings are deeply personal. Privacy requirements:

- **End-to-end encryption at rest** for all stored ratings.
- **No third-party sharing** without explicit per-event consent.
- **Full deletion paths**: the user must be able to delete all their data, irrevocably, on demand.
- **Audit logging** for all access to emotion data, including by the user themselves.
- **Local-first option**: ratings should be storable entirely on-device for users who prefer never to sync.
- **Export in standard formats**: VAD CSV, ideally PMHC-compatible for clinical use.

This is not legal compliance theater — emotion data is one of the most sensitive forms of personal data. Treat it accordingly.

---

## Part 5: Bibliography

Key sources cited above, in order of importance for the package:

1. **Mehrabian, A., & Russell, J.A. (1974).** *An approach to environmental psychology.* MIT Press. — original VAD/PAD model.

2. **Russell, J.A. (1980).** A circumplex model of affect. *Journal of Personality and Social Psychology, 39*(6), 1161–1178. — V/A circumplex.

3. **Mohammad, S.M. (2018).** Obtaining reliable human ratings of valence, arousal, and dominance for 20,000 English words. *Proceedings of ACL.* — NRC VAD Lexicon, primary vocabulary source.

4. **Warriner, A.B., Kuperman, V., & Brysbaert, M. (2013).** Norms of valence, arousal, and dominance for 13,915 English lemmas. *Behavior Research Methods, 45*(4), 1191–1207. — secondary vocabulary source.

5. **Ekman, P., & Friesen, W.V. (1978).** *Facial Action Coding System.* Consulting Psychologists Press. — FACS, basis for face glyph design.

6. **Barrett, L.F. (2017).** *How Emotions Are Made: The Secret Life of the Brain.* Houghton Mifflin Harcourt. — constructionist theory; rationale for V/A primacy.

7. **Lindquist, K.A., et al. (2012).** The brain basis of emotion: a meta-analytic review. *Behavioral and Brain Sciences, 35*(3), 121–143. — neural support for dimensional model.

8. **Kashdan, T.B., Barrett, L.F., & McKnight, P.E. (2015).** Unpacking emotion differentiation: transforming unpleasant experience by perceiving distinctions in negativity. *Current Directions in Psychological Science, 24*(1), 10–16. — emotional granularity research.

9. **Lieberman, M.D., et al. (2007).** Putting feelings into words: affect labeling disrupts amygdala activity. *Psychological Science, 18*(5), 421–428. — rationale for drag-then-tag sequence.

10. **Cordaro, D.T., et al. (2018).** Universals and cultural variations in 22 emotional expressions across five cultures. *Emotion, 18*(1), 75–93. — cross-cultural FACS validity.

11. **Mehling, W.E., et al. (2012).** The Multidimensional Assessment of Interoceptive Awareness (MAIA). *PLoS One, 7*(11), e48230. — interoception/somatic awareness foundations.

12. **Davis, R.N., Gross, J.J., & Ochsner, K.N. (2011).** Psychological distance and emotional experience: what you see is what you get. *Emotion, 11*(2), 438–444. — affect tracking principles.

13. **Kashdan, T.B., & Rottenberg, J. (2010).** Psychological flexibility as a fundamental aspect of health. *Clinical Psychology Review, 30*(7), 865–878. — flexibility over positivity.

14. **Ottosson, B. (2020).** A perceptual color space for image processing. — OKLab specification.

15. **Aviezer, H., et al. (2008).** Angry, disgusted, or afraid? Studies on the malleability of emotion perception. *Psychological Science, 19*(7), 724–732. — schematic face recognition.

16. **Damasio, A. (1999).** *The Feeling of What Happens.* Harcourt. — somatic-marker hypothesis; feeling-before-naming.

17. **Bolger, N., Davis, A., & Rafaeli, E. (2003).** Diary methods: capturing life as it is lived. *Annual Review of Psychology, 54*, 579–616. — longitudinal emotion methodology.

18. **Adams, F.M., & Osgood, C.E. (1973).** A cross-cultural study of the affective meanings of color. *Journal of Cross-Cultural Psychology, 4*(2), 135–156. — color-emotion associations.
