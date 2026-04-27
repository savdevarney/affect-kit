# NRC VAD vocabulary validation

The default English vocabulary in `packages/affect-kit/src/vocabulary/en.ts` must be sourced from validated affective-norms datasets before v1.0:

1. **Primary**: NRC VAD Lexicon (Mohammad 2018) — 20,000+ English words. Free for commercial and research use.
2. **Cross-reference**: Warriner et al. (2013) ANEW Extension — 13,915 lemmas with V/A.
3. **Tertiary**: Bradley & Lang (1999) ANEW Norms — 1,034 high-quality entries with V/A/D.

## Process (todo)

1. Pull the NRC VAD CSV from [saifmohammad.com/WebPages/nrc-vad.html](https://saifmohammad.com/WebPages/nrc-vad.html).
2. Build a script under `scripts/validate-vocabulary.ts` that reads the CSV, looks up each emotion in `EMOTIONS`, and produces this report:
   - Words missing from NRC entirely
   - Words whose prototype V/A/D differs from NRC by > 0.10 on any axis
   - Words whose `source` field is still `'approx'`
3. Replace prototype values with NRC values, rescaling from 0..1 → -1..1.
4. Document residual disagreements (where research judgment overrides the lexicon, with reasoning).
5. Mark the validation pass as complete and tag v1.0.

## Status

- [ ] NRC CSV ingested
- [ ] Validation script written
- [ ] Prototype values replaced with NRC entries
- [ ] Diff report committed alongside vocabulary file
- [ ] All `source` fields set to `'NRC'` or documented otherwise
