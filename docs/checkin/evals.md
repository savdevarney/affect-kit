# Evals for the agentic step

**Status:** plan, October 2026, with the first harness and test set built in the first slice (`packages/checkin-core/evals/`). The candidate models below were checked against Cloudflare's docs on 2026-10-05; the catalog moves weekly, so check again before each comparison.

**The rule:** the agentic step is a port (`FeelingExtractor`), and the eval suite exists *before* a model is chosen. Models are picked by these numbers, not by reputation.

## Contents

1. [What's evaluated](#1-whats-evaluated)
2. [The test set](#2-the-test-set)
3. [Metrics](#3-metrics)
4. [The human ceiling](#4-the-human-ceiling)
5. [Baselines and candidates](#5-baselines-and-candidates)
6. [The harness](#6-the-harness)
7. [Choosing a model](#7-choosing-a-model)
8. [After launch: corrections, shadow runs and blind picks](#8-after-launch-corrections-shadow-runs-and-blind-picks)
9. [The path to a fast classifier](#9-the-path-to-a-fast-classifier)
10. [What fine-tuning would take](#10-what-fine-tuning-would-take)
11. [Sources](#11-sources)
12. [First results](#12-first-results)

## 1. What's evaluated

| Port | In | Out | Main question |
|---|---|---|---|
| `FeelingExtractor` | Their text, and the face `{v, a}` (or `null`, for the ablation) | Vocabulary words with level, evidence and confidence; out-of-vocabulary words | Does it pick the words the person would pick, no more, at the right strength? |
| `SafetyScreen` | Their text | Show crisis resources or not | Does it ever miss? How often does it fire on hyperbole? |

They're evaluated separately, on separate test sets. The extractor's set has no crisis cases. The screen's set exists to find misses.

## 2. The test set

### Format

`packages/checkin-core/evals/feelings/cases.json`. Hand-written, synthetic and public: no one's real check-in is ever in git.

```jsonc
{
  "id": "mixed-proud-wiped",
  "face": { "v": 0.3, "a": -0.5 },
  "text": "Presentation went fine but I'm wiped. Kind of proud though.",
  "expected": [
    { "any": ["tired"], "level": 3 },              // a slot: any of these words fills it
    { "any": ["proud", "satisfied"], "level": 1 }
  ],
  "alsoFine": ["relieved"],                        // neutral: neither right nor wrong
  "forbidden": ["sad", "bored"],                   // clearly wrong: scored as a severe error
  "unmatched": [],                                 // their feeling words with no vocabulary fit
  "tags": ["mixed", "intensity"],
  "labelledBy": "draft"                            // draft → sav → reconciled
}
```

**Why slots and not a word list:** language maps onto the vocabulary many-to-one. "Freaking out" is fairly *panicked* or *anxious*; marking one of them wrong would measure our labelling, not the model. A slot is one feeling the person expressed, and any word in it fills it.

### What it covers

The first set has 48 cases. Each category gets at least 2, and the set grows toward 100 as real failure modes appear. Probiome's intake started at ~30.

| Tag | Example | What it catches |
|---|---|---|
| `clear` | "So proud of myself today" | The basics |
| `mixed` | "Excited about the move, but nervous" | Two feelings, opposite signs |
| `out-of-vocabulary` | "Stressed", "relieved", "meh", "burnt out" | Mapping to the nearest fit vs. keeping their word |
| `intensity` | "a bit anxious", "SO anxious" | Levels |
| `negation` | "Not anxious anymore", "less lonely than yesterday" | Words present but not felt |
| `sarcasm` | "Great, another flat tire" | Wrong-sign errors |
| `events-only` | "Meetings all day, then groceries" | Over-labelling when nothing was said |
| `body` | "Hungry and my back hurts" | Body states aren't feelings, except *tired* |
| `hyperbole` | "This commute is killing me" | Dark idioms that aren't crises |
| `face-conflict` | Face high and pleasant, words "fine, I guess" | Whether the face overrides the words (it mustn't) |
| `short` | "meh", "good", "ok" | Very little to go on |
| `long` | A rambling paragraph | Picking the main feelings, not every adjective |

`packages/checkin-core/evals/safety/cases.json` is the screen's set:
- crisis language: explicit, passive ("I wish I could just not wake up"), self-harm, and current slang (*unalive*, *kms*);
- third person ("my friend said she wants to die") and the past ("two years ago I attempted"), which should also show resources;
- hyperbole, which shouldn't ("I could murder a burrito");
- a few marked `either` that aren't scored, so the screen isn't tuned to our own edge cases.

### Who labels

The first draft labels were written by Claude and are marked `labelledBy: "draft"`. They're a starting point, not ground truth. Before any model decision, two people label every case independently, from the text and face alone. Then they reconcile: disagreements become wider slots or `alsoFine` words. Each annotator's own labels are kept, for § 4.

## 3. Metrics

Scored per extractor, with the face and without, in pure functions (`evals/scoring.ts`) that are unit-tested like Probiome's.

**Word agreement:**
- **Slot recall:** slots filled ÷ slots expected. "Did it find what they said?"
- **Slot precision:** predicted words that fill a slot ÷ predicted words, with `alsoFine` words left out of both. "Is what it found right?"
- **F1**, micro-averaged over the set. Also the exact-set rate, and agreement per tag.

**Intensity:** for filled slots with a level, the exact-level rate, plus the count of far misses (1 for 3, or 3 for 1). Levels are three steps, so "within one" says little on its own.

**Over-labelling:**
- mean words predicted against mean slots expected;
- the share of cases with an extra word;
- **any word at all on `events-only` cases**: what a person would most resent, a feeling put in their mouth.

**Severe errors:**
- **Forbidden words.** Mostly wrong-sign mistakes from sarcasm and negation, scored and listed one by one.
- **Forced fits:** an out-of-vocabulary word mapped to a vocabulary word outside every slot.

**Evidence:** the share of predicted words whose evidence is really in the text, before the policy drops the rest. A low rate means the model invents support.

**Reliability:** schema-valid outputs; errors and timeouts.

**Calibration:** precision by confidence band (under 0.5, 0.5–0.7, 0.7–0.9, 0.9 and up), and the expected calibration error. Only rough at 40 cases, but it decides whether a confidence threshold can mean anything.

**Cost:** p50 and p95 latency, input and output tokens, and dollars per 1,000 check-ins, from the run's own meter (and AI Gateway metadata in production).

**Safety screen:** recall on `show: true` cases (the target is **every one**, by tag), and the false-positive rate on hyperbole, by tag.

## 4. The human ceiling

A model can't be held to more agreement than people reach with each other. Probiome's photo benchmark set its ceiling from published Bristol-scale studies; here we measure our own:

- **Annotator agreement on this set:** each annotator's slots scored against the other's (symmetric F1), and their level agreement. If the best model matches an annotator as well as the annotators match each other, more model work buys nothing *on this set*.
- **Published agreement on emotion labels from text is low,** and that's the honest frame for any number we report. Third-party annotators label what a text *seems* to say, and they agree only moderately ([§ 11, sources](#11-sources)).
- **The real ceiling is self-report.** For check-ins, the person who wrote the words is the reference, not an annotator. The target is "the words they'd pick themselves", which only the blind-pick study (§ 8) measures.

## 5. Baselines and candidates

Every candidate is compared with the two baselines, which need no model:

| Id | What | Why it's there |
|---|---|---|
| `face-nearest` | The two vocabulary words nearest the face, as the rater sorts them. **Ignores the text** | Measures what the words add over the anchor alone. If a model barely beats it, the conversation isn't pulling its weight |
| `lexicon` | Word and phrase matching with a small synonym table, intensifiers and negation | The deterministic floor. It's also the fallback in production and the on-device path |

**System 2 candidates** (Workers AI, Cloudflare-hosted, JSON mode, through AI Gateway):

| Model | Size | Context | $ per million tokens, in / out | Schema shape |
|---|---|---|---|---|
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | 70B (fp8) | 24k | 0.293 / 2.253 | `response_format`, legacy shape (Probiome's extractor today) |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | 17B active, 16 experts | 131k | 0.27 / 0.85 | legacy |
| `@cf/openai/gpt-oss-120b` | 120B | 128k | 0.35 / 0.75 | legacy |
| `@cf/openai/gpt-oss-20b` | 20B | 128k | 0.20 / 0.30 | legacy |
| `@cf/qwen/qwen3-30b-a3b-fp8` | 30B, 3B active | 33k | 0.051 / 0.335 | legacy |
| `@cf/qwen/qwen3.8-27b` | 27B (Clef's base model) | 262k | 0.45 / 3.20 | OpenAI shape |
| `@cf/google/gemma-4-26b-a4b-it` | 26B, 4B active | 256k | 0.10 / 0.30 | OpenAI shape |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | 24B | 128k | 0.351 / 0.555 | `guided_json` only |

**Two things the docs don't make obvious:**
- **The JSON-mode page is stale.** It lists six models, four of them deprecated. Which shape each model takes comes from that model's own input schema: the legacy `{type: "json_schema", json_schema: <schema>}`, the OpenAI-style `{…, json_schema: {name, schema, strict}}`, or `guided_json`. The adapter keeps a table (`JSON_SHAPES`).
- **The schema isn't guaranteed.** Cloudflare says it "can't guarantee" a model follows it, and streaming is off in JSON mode. That's why every answer is parsed with Zod, item by item ([JSON mode](https://developers.cloudflare.com/workers-ai/features/json-mode/)).

Gemma 3 was retired on 2026-05-30. Newer catalog models (GLM-4.7-flash, DeepSeek V4 flash, Nemotron 3) are worth adding once their ids are confirmed.

Each runs with and without the face, as prompt `feelings-v1`. The vocabulary's 55 words go into the JSON schema as an `enum`, so the output can only name real words.

**A frontier reference, maybe.** A frontier model on the synthetic set only would show how far the open models are from the best available. It isn't a candidate: the privacy notice names Cloudflare as the only model host, and the set is public and synthetic, so nothing personal would be sent. Run it only if the open models disappoint, to tell "the task is hard" from "the model is weak".

**System 1 candidate:** Clef-flash (§ 9).

## 6. The harness

```
pnpm --filter @affect-kit/checkin-core eval feelings [--extractors face-nearest,lexicon,workers-ai:<model>] [--ablation] [--only id,id] [--baseline]
pnpm --filter @affect-kit/checkin-core eval safety
```

- **Ablation:** `--ablation` runs each extractor with and without the face.
- **Where it runs:** in Node, against the same adapters the Worker binds. Workers AI is reached through Wrangler's platform proxy with a remote AI binding and your own `wrangler login`. That's Probiome's photo-eval pattern.
- **What it writes:**
  - a table to the terminal;
  - a markdown and JSON report to `evals/reports/` (gitignored, because it's per run);
  - with `--baseline`, a committed `evals/baseline.md`.
- **Reports in git:** the data is synthetic, so per-case results *can* be committed, unlike Probiome's photo reports. The committed baseline lists every miss, with its text, so a reviewer sees what each model gets wrong.
- **The safety set runs in CI** on every change to `checkin-core` (it's pure TS, so it's free). A crisis case that stops showing resources fails the build.

## 7. Choosing a model

A decision rule, written down before the numbers come in:

1. **Disqualify:**
   - any forbidden-word rate above 2% of cases;
   - any evidence rate under 95%;
   - any schema failure that survives one retry;
   - p95 latency over 3 s.
2. Among the rest, take the **cheapest model whose F1 is within 3 points of the best**, after checking that its far-miss count on levels isn't worse.
3. **It has to beat `lexicon` clearly.** If it doesn't, ship the lexicon and keep the model for the gaps.
4. **Note the face ablation either way.** If the face doesn't help the parser, say so in the case study: that's a finding.

These thresholds are first guesses, to revisit after the first real run, as Probiome's were.

## 8. After launch: corrections, shadow runs and blind picks

- **Corrections per extractor version.** Track the edit rate: removed (precision), added (recall), level changed (intensity). They're the production versions of the metrics above.
- **Acceptance bias.** People tend to accept what they're shown, so "kept" isn't strong agreement. Automation bias is well documented. Read edit rates as a floor on disagreement, not a measure of it.
- **Blind picks: the study that fixes it.** People who opt in to a research mode see the full rater first, on about one check-in in five, and pick their own words; then they write; then the model parses. Model against blind pick is the real agreement number, free of anchoring. It costs those people the old effort, which is why it's opt-in and sampled.
- **Shadow runs.** A new extractor runs beside the live one on new check-ins (`extraction_runs.purpose = 'shadow'`); nobody sees its output. It's compared with what people reviewed. It's promoted by changing the binding in the composition root. Past check-ins keep the run that made them.

## 9. The path to a fast classifier

The flywheel: people write, the LLM proposes, people correct, and the corrections become examples for a faster model, with the LLM kept for the hard cases.

1. **Now:** an LLM is the extractor (System 2), and every run is versioned.
2. **Clef-flash in shadow.** Clef-flash is Cloudflare's own decision model, launched 2026-10-01: 9B parameters, Cloudflare-hosted, with probabilities meant to be calibrated ([Clef](https://developers.cloudflare.com/workers-ai/models/clef/), [changelog](https://developers.cloudflare.com/changelog/post/2026-10-01-clef-workers-ai/)).
   - **No multi-select.** It has no "which of these apply" question: each question is yes/no (`noul`), a choice, or a score. So ask it **55 yes/no questions in one request**, one per word (the limit is 64), and get a probability for each.
   - **Strength takes a second request** of `score` questions.
   - **It writes no text,** so there's no evidence quote. Its words would need the lexicon's quotes, or none.
   - **Cost:** about $0.09 per million input tokens, roughly $0.0001 a check-in. Cloudflare's benchmark gives a 39 ms median.
   - Compare it with the LLM and with people's reviewed words.
3. **A router, in code.** If Clef is sure (every chosen word above a high threshold, no unmatched words, no ambiguity), it's the answer. Otherwise the LLM runs. Thresholds come from the eval set. The routing rule is plain TypeScript and unit-tested.
4. **Our own small model.** A multi-label classifier: a Workers AI text embedding (`bge-base-en-v1.5`, 768 dimensions, $0.067 per million tokens; or `bge-m3`, `qwen3-embedding-0.6b`), then a small trained head with 55 outputs and an intensity output.
   - **Size:** a 768-by-55 linear layer is about 42,000 numbers. It runs in a Worker in microseconds, and on a phone too, which is the local-first path.
   - **Data:** consented, reviewed check-ins plus synthetic ones. That's Probiome's decision 9 (frozen embeddings and a small head first), in text.

## 10. What fine-tuning would take

| Route | What it needs | Fit |
|---|---|---|
| **Our own head on embeddings** (recommended first) | Labeled examples per word: a rough first target is 30–50 for each of the 55 words, so a few thousand check-ins. Rarer words (*contempt*, *enchanted*) will need synthetic examples. Training is a small job on a CPU (a Cloudflare Container, as Probiome plans for photos) | Cheapest; runs anywhere; we own it fully |
| **Workers AI LoRA** on a supported text model | Hundreds to thousands of input→JSON pairs. LoRA (open beta, free) runs only on the listed bases, such as Llama 3.2 3B, Mistral 7B and Gemma 7B: rank at most 32, under 300 MB ([LoRA](https://developers.cloudflare.com/workers-ai/features/fine-tunes/loras/)) | Keeps generation, so evidence quotes and their own words still work. The bases are small and older, and Cloudflare says LoRA models "may be deprecated" |
| **Clef fine-tuning** (Cloudflare's reinforcement-learning offer) | Cloudflare's design-partner program. Its datasets are built from AI Gateway traffic, which means payload logging, which this app keeps off. Data terms aren't published | Keeps calibrated probabilities. It conflicts with the logging rule as described, so ask Cloudflare first, as Probiome did |

**Every route needs:**
- **Consent.** Training on people's words needs its own opt-in, off by default. The privacy notice says we don't train on words until it does ([privacy.md](privacy.md)).
- **A held-out benchmark that never trains anything.** This test set, plus a consented blind-pick set, is how a model is benchmarked independently. A version that has seen its test cases isn't measured.
- **A model card,** committed with the model: what it's for and not for, the data by version (counts per word, no text), every metric here against the baselines and the human ceiling, and known failure modes, such as dialects and non-native English.
- **Deletion.** A deleted check-in leaves future training sets. A model already trained on it can't fully forget it, and the notice says so (Probiome's wording).

## 11. Sources

- **Agreement between annotators.**
  - GoEmotions (Demszky et al. 2020, [doi](https://doi.org/10.18653/v1/2020.acl-main.372)): at least three raters agreed on a label for only 31% of items. Agreement by emotion ran from κ 0.10 (grief) to 0.75 (gratitude), and relief was 0.19. The baseline model scored macro-F1 0.46.
  - SemEval-2018 tweets (Mohammad et al. 2018, [doi](https://doi.org/10.18653/v1/S18-1001)): Fleiss κ 0.21 for emotion classes, with intensity more reliable (split-half 0.82–0.92).
- **The writer's own label is harder.**
  - In WRIME (Kajiwara et al. 2021, [doi](https://doi.org/10.18653/v1/2021.naacl-main.169)), writers and readers agreed at κw 0.44–0.47, below agreement between readers. Models predicted the writers' own labels worse than the readers'.
  - GPT-4 matched outside observers more closely than authors' self-reports (Tak & Gratch 2024, [arXiv](https://arxiv.org/abs/2408.13718)).
  - That's why self-report, through blind picks, is the target (§ 4, § 8).
- **The human ceiling** is a guide, not a hard limit (Boguslav & Cohen 2017, [doi](https://doi.org/10.3233/978-1-61499-830-3-298)).
- **Workers AI and Clef:** model pages and pricing, checked 2026-10-05 ([catalog](https://developers.cloudflare.com/workers-ai/models/), [pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [Clef input schema](https://developers.cloudflare.com/workers-ai/models/clef/schema-input.json)).

## 12. First results

**2026-10-05: one run, 48 cases, draft labels.** Calls went through Wrangler's platform proxy from a laptop, two at a time, with transient errors retried. Every miss is listed in `packages/checkin-core/evals/baseline.md` (PR #16).

| Extractor | F1, with face / without | Exact sets | Levels exact | Cases with a forbidden word | p50 / p95 latency, with face | $ per 1,000 check-ins |
|---|---|---|---|---|---|---|
| face-nearest (no text) | 0.17 | 4% | — | 0 | — | 0 |
| lexicon | 0.77 / 0.77 | 71% | 91% | 4 | instant | 0 |
| **Llama 3.3 70B fp8-fast** | **0.94** / 0.92 | **92%** | 81% | **1** / 3 | 2.0 s / 9.4 s | 0.49 |
| Llama 4 Scout | 0.81 / 0.88 | 71% | 79% | 3 / 4 | 1.5 s / 3.5 s | 0.40 |
| gpt-oss-120b | 0.77 / 0.83 | 75% | 83% | 1 / 2 | 8.5 s / 14.1 s | 0.74 |
| gpt-oss-20b | 0.83 / 0.78 | 77% | 82% | 2 / 2 | 3.9 s / 8.4 s | 0.38 |
| Qwen3 30B-A3B | 0.76 / 0.76 | 77% | 82% | 0 / 2 | 4.5 s / 6.5 s | 0.24 |
| Gemma 4 26B-A4B, Mistral Small 3.1, Qwen3.8 27B | not comparable | | | | | |

Gemma 4, Mistral Small 3.1 and Qwen3.8 27B mostly failed to return JSON in the shape the adapter expects (33, 48 and 24 of 48 cases). That measures our integration, not the models. Fix their request and response shapes before judging them.

**What it says:**
1. **The words carry the signal.** The face alone scores 0.17, simple matching 0.77, the best model 0.94. The conversation is pulling its weight.
2. **Llama 3.3 70B is the most accurate,** with no errors and every quote really in the text. Its misses are worth reading:
   - one sarcasm case ("Thrilled." read as *excited*);
   - one word on an events-only check-in ("Made pasta, called mom…" → *content*);
   - one inference from "Relieved to stay home" (*relaxed*);
   - one missed second feeling.
3. **Nothing is fast enough.** The best model takes about 2 s typically and 4–9 s at the 95th percentile, and every model fails the 3 s p95 bar. Speed has to come from the cascade, not from picking a different LLM:
   - simple matching in the browser while they type;
   - a System 1 model (Clef-flash, or our own head on embeddings) for the common case;
   - the LLM only for hard check-ins.
4. **The face's effect on the parser is inconclusive.** It adds 0.02 for Llama 3.3, with fewer sarcasm errors (1 forbidden case against 3), but takes 0.07 from Scout and 0.06 from gpt-oss-120b. Forty-eight cases can't settle it; keep it in the ablation.
5. **Their own words are rarely listed by the models** (17% for Llama 3.3). Prompt v2 should ask for them more firmly.
6. **The lexicon's numbers are flattered.** Its 100% on their own words and 91% on levels come partly from one agent having written both its table and these labels. The blind second labelling (§ 4) will correct that.

**The choice for now:** Llama 3.3 70B fp8-fast as System 2: quality first, and the model Probiome's intake already uses. Revisit when two people have labelled the set blind and System 1 has been measured.

**The decision rule, revisited (§ 7):**
- "2% of cases" is finer than one case in 48, so make it "at most one forbidden case per 50".
- Measure p95 from a deployed Worker, not from a laptop through the proxy.
