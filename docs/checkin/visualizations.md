# Showing the log: day and week views

**Status:** concepts and wording rules, October 2026. Two are prototyped in the first slice: the **day timeline** (real data) and the **word calendar** (synthetic data only). Nothing directional is built until Sav approves it (§ 4).

**The position:** the package never interprets a series of ratings ([longitudinal-future.md](../longitudinal-future.md)). The app may show a series, but only as **what the person logged**, described, never judged. The person reads the direction; the app never says it.

## 1. Rules for every view

1. **What was logged, nothing else.**
   - Words appear as the person reviewed them, each with the time of its check-in and their own text one tap away.
   - Out-of-vocabulary words show as their own words: *relieved* (your word).
2. **No lines between check-ins.** A line implies a feeling continued between two moments. We have moments, so we draw dots, chips and faces.
3. **No smoothing, trend lines, forecasts or averages shown as numbers.** No composite of any kind: no mood score, no wellness index, no average face as a headline.
4. **Gaps are gaps.** A day without check-ins is empty, not neutral, and never "missed".
5. **Counts with their denominator.** Write "*calm* on 4 of 7 days", never "57%". The number of check-ins is always on screen.
6. **Same scale, same order** across periods, so two weeks can be read side by side.
7. **Color comes from the lexicon.** A word's color is its own V/A color, from the package's four-quadrant blend: color in *words* mode. The face uses the face's color. There's never a red-for-bad or green-for-good layer.
8. **Identity is never color alone.** Every word is written as a word; color only echoes it. Every chart has a table form (some are tables).
9. **Nothing is ranked.** No best day, no worst week.

## 2. Wording rules

Adapted from Probiome's evidence-grading skill (§ 5, Wording): **the data type decides the verb.** Every sentence the app shows comes from one module (`checkin-core/src/words.ts`), which has a test that runs these rules.

| What's shown | Say | Never say |
|---|---|---|
| A word in a check-in | "*anxious*, 9:02" · "you logged *anxious*" | "you were anxious", "you felt anxious" (we know what they logged, not what they felt) |
| A count over a period | "*calm* on 4 of 7 days" · "*calm* 6 times this week" | "mostly calm", "a calm week" |
| Two periods | "*calm*: 6 this week · 2 last week", side by side, in the same order | "more calm", "calmer", "up 200%", "improving" |
| The face | The face itself, with its time | "positive", "negative", "good mood", "low mood" |
| A word not logged | Nothing | "no anxiety this week!" (it praises an absence) |
| No check-ins | "No check-ins" | "missed", "streak broken", "you forgot" |
| Their own word | "*relieved* (your word)" | silently mapping it to the nearest vocabulary word |

**Banned in the app's own voice:**
- *Verdicts:* improving, better, worse, declining, progress, recovery, resilient, resilience, stuck, trend, normal, abnormal, healthy, unhealthy, good day, bad day.
- *Measurement claims:* score, mood score, wellness, risk, insight, pattern.
- *Clinical words:* symptom, depression, depressed, disorder, diagnosis.
- *Advice:* should, try, consider, you seem, you tend to.
- *Pressure:* streak, missed.

Quoting the person's own text is always allowed; the rules apply to what the *app* says.

**Directional sentences** are only ever side-by-side counts. The person can see that 6 is more than 2; the app doesn't add a word that says so.

A note on the brief's example ("more *calm* and *focused* this week than last"): under these rules it becomes "*calm*: 6 this week · 2 last week". Also, *focused* isn't one of affect-kit's 55 words. The vocabulary dropped it as attentional rather than affective (`vocabulary/en.ts`). In this app it would arrive as their own word.

## 3. Concepts

### A. Day: the day as you logged it — *prototype, in the slice*

A vertical timeline, newest at the bottom (it's a day; it reads like one):

```
 9:02  (face)  anxious ◎◎   overwhelmed ◎
               "Big review today and I haven't slept much"
12:40  (face)  relieved (your word)   content ◎
14:15  ·····   (nothing between check-ins is drawn)
18:30  (face)  tired ◎◎◎   proud ◎◎
```

- Each check-in shows its time, the face glyph at its own V/A, and the reviewed words as chips. Chip rings show the level, as in the rater. The text is one tap away.
- Unreviewed check-ins (the person never pressed Done) show their words dimmed, with "not reviewed".
- **Why it's honest:** every mark is something the person did. Single-rating display is the package's own honest unit (logbook-not-diagnostic), so the timeline is just several of them in order.

### B. Day: the words on the lexicon's map — *concept*

The day's words placed at their own lexicon V/A coordinates, on a plain plane with no quadrant names, ordered by time with a small index.

It's beautiful, and it's how the rater sorts words. **The risk:** placing words in quadrants invites reading quadrants as states ("you spent the day in the anxious corner"), which the capture flow never claims. If it's built: no region labels, no shading, and the axes named only as the pad names them (unpleasant ↔ pleasant, calm ↔ activated).

### C. Weeks: the word calendar — *prototype, synthetic data*

A grid with the words the person used as rows, days as columns, and a dot where a word was logged:

```
              M   T   W   T   F   S   S   │  M   T   W   T   F   S   S
calm          ·   ●   ·   ●   ●   ·   ●   │  ·   ·   ●   ·   ·   ·   ●
content       ●   ·   ●   ·   ·   ●   ·   │  ●   ·   ·   ·   ●   ·   ·
anxious       ·   ●   ·   ·   ●   ·   ·   │  ●   ●   ·   ●   ·   ·   ·
tired         ●   ●   ·   ●   ·   ·   ·   │  ●   ●   ●   ●   ●   ·   ·
relieved*     ·   ·   ·   ·   ●   ·   ·   │  ·   ·   ·   ·   ·   ·   ·
check-ins     2   3   1   2   3   1   2   │  3   2   2   2   2   0   1
```

- **Rows:**
  - only words they used, in lexicon order: pleasant to unpleasant, then by arousal, so neighbours are related;
  - their own words, marked \*, come last;
  - long histories fold rarely used words into "N more words".
- **Dots:** the size shows the strongest level that day (1–3); the color is the word's lexicon color.
- **Check-ins row:** the denominator, always on screen.
- **Columns:** a thin rule between weeks, with weeks side by side. A count column at each week's end is the only "directional" part (§ 4).
- **It is a table:** an HTML `<table>`, so screen readers get "calm, Tuesday, level 2" from the headers. Hovering or focusing a dot shows the times and their text.
- **Why it's honest:** presence and counts, laid out evenly in time; nothing computed beyond counting.

### D. Weeks: one word cloud per week — *concept*

Small multiples of `<affect-kit-result>`, each fed `averageRatings()` of one week, so words are sized by mean level with a frequency boost. It uses the package's own longitudinal display, and it's lovely.

**The catch:** the size is a composite (level × frequency), so a reader can't tell "said once, strongly" from "said often, mildly". The calendar shows both plainly, so it comes first. The cloud would need a caption saying what size means.

## 4. Directional views — need Sav's OK

These show change over time as data. Under the rules they describe and never judge, but they're the views most easily *read* as a verdict, so none is built beyond a prototype without approval.

| View | What it shows | Recommendation |
|---|---|---|
| **Week-by-week counts** (the calendar's count column, or a small table: word · this week · last week) | Counts side by side, no arrows, no deltas | **Build.** The least interpretive way to show change |
| **The face's valence over time** | One dot per check-in at its face's V, over weeks, no line, rows of faces optional | **Maybe.** Valence is the axis people and research agree on most (longitudinal-future.md), but a column of dots trending down is a verdict-shaped picture. If built: show the dots only, never a mean |
| **The week's average face** | One face per week from `averageRatings` | **Don't.** An average face is a mood-of-the-week headline. It hides spread, and a sad average face is a verdict whatever the caption says |

The future longitudinal recipes in [longitudinal-future.md](../longitudinal-future.md) (inertia, recovery, range) stay out of this app until each meets that doc's bar: a defended default, a cited paper and a story for what it doesn't claim.

## 5. Not building

- **Streaks and badges.** A streak turns a gap into a failure, and a mood log shouldn't scold. Reminders the person sets are fine.
- **"Insights" or patterns the app finds.** "You're anxious on Mondays" is an interpretation of a series. The calendar lets them see Mondays themselves.
- **Comparisons with other people.** No "people like you", no norms.
