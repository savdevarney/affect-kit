# PHQ-9 and GAD-7: a research question, not a feature

**Status:** research notes, October 2026. Sources checked on 2026-10-05.

**The position:** this app never shows a score, a screening result or a diagnosis, and never computes one for the person. Whether check-ins could *map onto* validated instrument items is an open research question. Answering it would take a study, a clinical partner and ethics approval, and its results would never flow back into the logbook as numbers.

**Why the line is firm:**
- **Logbook, not diagnostic.** That's affect-kit's own position ([longitudinal-future.md](../longitudinal-future.md)).
- **FDA.** A PHQ-9 score or a "depression risk" relates to diagnosis, which puts it outside the General Wellness policy ([guidance, 2026](https://www.fda.gov/media/90652/download)).
- **State law.** Illinois and Nevada restrict AI that diagnoses or treats mental health ([safety.md](safety.md) § 5).
- **Item 9** asks about thoughts of self-harm. That needs a safety protocol, not a score (§ 2).

## 1. What the instruments are

| Instrument | What it asks | Validation | Licence |
|---|---|---|---|
| **PHQ-9** | 9 symptoms of depression over **the past two weeks**, each scored 0–3 | At a cut-off of 10: 88% sensitivity and 88% specificity against a mental-health professional's interview (n=580). Test–retest r=.84 at 48 hours (Kroenke, Spitzer & Williams 2001, [doi](https://doi.org/10.1046/j.1525-1497.2001.016009606.x)). Accuracy depends on the reference interview: lower against the MINI than a semi-structured one (Levis et al. 2019, [doi](https://doi.org/10.1136/bmj.l1476)) | Developed by Spitzer, Williams, Kroenke and colleagues with an educational grant from Pfizer. No permission needed to reproduce, translate, display or distribute it. Modified versions and commercial use aren't addressed ([terms](https://www.phqscreeners.com/terms)) |
| **GAD-7** | 7 symptoms of generalized anxiety over the past two weeks | At a cut-off of 10: 89% sensitivity and 82% specificity (Spitzer et al. 2006, [doi](https://doi.org/10.1001/archinte.166.10.1092)) | Same terms |

**How often they're used.** These instruments are known everywhere and filled in rarely. That's the self-report problem the case study is about:
- Fewer than 20% of behavioural-health clinicians measure outcomes routinely (Lewis et al. 2019, [doi](https://doi.org/10.1001/jamapsychiatry.2018.3329)).
- In US health plans' 2023 quality data, a PHQ-9 was recorded alongside a depression visit for 4.6% of commercial members, 6.9% of Medicaid members and 14.0% of Medicare members (NCQA 2024, [report](https://wpcdn.ncqa.org/www-prod/wp-content/uploads/Special-Report-Nov-2024-Results-for-Measures-Leveraging-Electronic-Clinical-Data-for-HEDIS.pdf)).
- Where they're built into the service, it works: England's NHS Talking Therapies gives both at every session and has outcome data for 98.5% of patients ([manual](https://www.england.nhs.uk/wp-content/uploads/2018/06/nhs-talking-therapies-manual-v7.1-updated.pdf)).

## 2. What's known about deriving them

- **The PHQ-9 on a phone, several times a day.**
  - 13 patients answered for 30 days, with 78% adherence. Their app scores correlated r=.84 with clinic scores but ran about 3 points higher, and **more patients reported suicidal thoughts in the app than in clinic** (Torous et al. 2015, [doi](https://doi.org/10.2196/mental.3889)).
  - A 90-day mobile PHQ-9 (N=280, 84% women) correlated r=.71 with the standard form (Haddox et al. 2025, [doi](https://doi.org/10.1037/pas0001431)).
- **Momentary reports aren't recall.**
  - Daily ratings correlate only r=.3–.6 with the two-week PHQ-9 (Baryshnikov et al. 2023, [doi](https://doi.org/10.1016/j.jad.2022.12.127)).
  - Rated afterward, a whole day carries more emotion, and more unpleasant emotion, than its episodes rated one by one (Miron-Shatz, Stone & Kahneman 2009, [doi](https://doi.org/10.1037/a0017823)).
  - An average of check-ins isn't a PHQ score without calibration.
- **Text to scores.**
  - Pre-registered models that scored people's own written answers reached r=.60–.79 against the PHQ-9 and GAD-7 in a new sample of 145 (Gu et al. 2026, [doi](https://doi.org/10.1177/10731911251364022)). That's the closest published work to this app.
  - Work on clinical interview transcripts (DAIC-WOZ) is weaker evidence than it looks: the interviewer's scripted prompts alone give a shortcut to the answer (Burdisso et al. 2024, [doi](https://doi.org/10.18653/v1/2024.clinicalnlp-1.8)).
- **Item 9.** Only 28.6% of positive answers on item 9 were confirmed by a structured suicide-risk interview, the C-SSRS (Na et al. 2018, [doi](https://doi.org/10.1016/j.jad.2018.02.045)). A positive item needs a person and a protocol, not a number.
- **The comparison is usually another questionnaire,** not a diagnosis. And there's no study yet validating an EMA- or text-derived PHQ or GAD score against a clinician's interview.

## 3. What check-ins cover, item by item

| PHQ-9 item | What a check-in could carry | Coverage |
|---|---|---|
| 1. Little interest or pleasure | Not a word anyone says; and an *absent* pleasant word is no evidence of anything | **None** |
| 2. Feeling down, depressed or hopeless | *sad*, *hopeless*, *empty* | Partial |
| 3. Sleep | Not a feeling; an "about" label later, from their words | None today |
| 4. Tired or little energy | *tired* | Partial |
| 5. Appetite | Not a feeling | None |
| 6. Feeling bad about yourself | *ashamed*, *guilty* | Partial |
| 7. Trouble concentrating | Not affective; the vocabulary dropped *focused* for that reason | None |
| 8. Moving slowly, or restless | Not a feeling word; *restless* would be their own word | None |
| 9. Thoughts of self-harm | The safety screen, which never scores and is never stored | **Never a score** |

| GAD-7 item | What a check-in could carry | Coverage |
|---|---|---|
| 1. Nervous, anxious or on edge | *anxious* | Good |
| 2. Can't stop worrying | *anxious*; frequency over days | Partial |
| 3. Worrying too much about different things | "about" labels across days, later | Partial |
| 4. Trouble relaxing | *relaxed* (logged, or not) | Weak: an absence again |
| 5. So restless it's hard to sit still | *restless*, as their own word | Weak |
| 6. Easily annoyed or irritable | *annoyed*, *frustrated* | Partial |
| 7. Afraid something awful might happen | *fear*, *anxious* | Partial |

**What this shows:** check-ins carry the affective items and miss the somatic ones (sleep, appetite, energy, psychomotor) and the cognitive ones (concentration). An affect logbook isn't a PHQ in disguise. At most, it's a partial, momentary view of some items, and the honest research question is narrower than "can we derive a PHQ-9?"

## 4. The research question, stated honestly

> Do momentary, self-chosen feeling words, aggregated over two weeks, track the affective items of the PHQ-9 and GAD-7, and how well, for whom, and with what calibration, against both the questionnaires and a clinician's interview?

What answering it would take:
- **A design reported to standard.** The COSMIN measurement properties (Mokkink et al. 2010, [doi](https://doi.org/10.1016/j.jclinepi.2010.02.006)):
  - test–retest reliability and measurement error;
  - structural validity;
  - measurement invariance across groups (language, age, gender, culture);
  - criterion validity;
  - responsiveness.
- **A real reference.** A blinded clinical interview (SCID or MINI), reported following STARD (Bossuyt et al. 2015, [doi](https://doi.org/10.1136/bmj.h5527)). Not just the questionnaire.
- **A model fixed before testing,** pre-registered and reported following TRIPOD+AI (Collins et al. 2024, [doi](https://doi.org/10.1136/bmj-2023-078378)), the way Gu et al. did.
- **Ethics.** IRB review under the Common Rule (45 CFR 46), informed consent for the study, its own data store, and an item-9 protocol with a clinician on call.
- **A partner.** An emotion-dynamics lab, which longitudinal-future.md already suggests (Kuppens' group in Leuven), and a clinical team.
- **A wall between the study and the app.** Participants never see derived scores, and the logbook never gains a score because a study exists.

## 5. What we'd measure first, without any of that

None of these needs an instrument, and all of them stay descriptive:
- Do people keep checking in? Completion over weeks.
- Do the words carry information the face doesn't? The `face-nearest` baseline ([evals.md](evals.md)).
- Does using the app change emotional granularity, the number and spread of distinct words people use? That's descriptive, and an open research question, with modest evidence that self-monitoring helps people tell negative emotions apart (Widdershoven et al. 2019, [doi](https://doi.org/10.1016/j.jad.2018.10.092); Hoemann et al. 2021, [doi](https://doi.org/10.3389/fpsyg.2021.704125)).
