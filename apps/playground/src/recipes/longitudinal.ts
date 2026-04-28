// Recipe: derive longitudinal summary signals (Inertia, Resilience, Range)
// from a `Rating[]` series. This is example code — copy it into your own app
// and adapt the thresholds / signals as fits your use case. The affect-kit
// package itself ships only `<affect-kit-rater>` / `<affect-kit-result>` /
// `<affect-kit-face>` and the `averageRatings` helper.
//
// Pure: no DOM, no Lit, no state. Inputs are sorted ascending by timestamp
// inside computeLongitudinalSummary — callers need not pre-sort.
//
// Clinical backing (documentation only; UI uses plain language):
//   Inertia    ← emotional inertia (Kuppens et al. 2010, Psychol. Science)
//   Resilience ← affect recovery / resilience (Ong et al. 2006, J. Pers.)
//   Range      ← affective variability / non-suppression (Gruber et al. 2013)

import type { Rating } from 'affect-kit';

// ─── Thresholds ────────────────────────────────────────────────────────────

/** pad.v below this counts as a "difficult" session for Bounce/Momentum. */
const STUCK_V   = -0.3;
/** pad.v at or above this counts as "recovered". */
const RECOVER_V =  0.0;
/** Consecutive difficult sessions before isCurrentlyStuck fires. */
const STUCK_MIN =  3;
/** Minimum sessions before Inertia and Range are non-null. */
const MIN_MOMENTUM = 5;
const MIN_RANGE    = 5;
/** Fraction of sessions considered "recent" for word-cloud trend. */
const RECENT_FRAC  = 0.4;

// ─── Types ─────────────────────────────────────────────────────────────────

/** One entry in the word cloud, sorted by weight descending. */
export interface WordCloudEntry {
  /** Emotion label name. */
  name: string;
  /** Accumulated frequency × intensity — drives relative font size. */
  weight: number;
  /** Direction of change comparing recent sessions to the full history. */
  trend: 'rising' | 'falling' | 'stable';
}

/**
 * Inertia — how much the emotional state is moving vs. staying put.
 * Low score + stuckStreak > 0 = emotionally stuck in a negative place.
 */
export interface InertiaSummary {
  /** 0..1. Higher = more movement session to session. */
  score: number;
  /** Consecutive trailing sessions with pad.v < STUCK_V. */
  stuckStreak: number;
  /** True when stuckStreak ≥ STUCK_MIN. */
  isCurrentlyStuck: boolean;
  /** pad.v values in chronological order — use for sparkline rendering. */
  sparkline: number[];
}

/** One negative episode and the session it recovered in (if it has). */
export interface RecoveryArc {
  /** Index (in the sorted ratings array) where the episode started. */
  startIndex: number;
  /** Index of first session at or above RECOVER_V, or null if ongoing. */
  recoveredAtIndex: number | null;
  /** Number of sessions from start to recovery, or null if ongoing. */
  lengthSessions: number | null;
}

/**
 * Resilience — how quickly the person moves out of difficult states.
 * null when no negative episode has been recorded yet.
 */
export interface ResilienceSummary {
  /** Average sessions to recover across all completed arcs, or null. */
  avgRecoverySessions: number | null;
  /** Length of the most recent completed recovery arc, or null. */
  lastRecoveryLength: number | null;
  /** All detected arcs, including any ongoing one at the end. */
  arcs: RecoveryArc[];
}

/**
 * Range — how much of the emotional spectrum the person authentically visits.
 * A score near 0 means either always-positive (possible suppression) or
 * always-negative (stuck). A healthy score reflects genuine variability.
 */
export interface RangeSummary {
  /** Fraction of sessions with pad.v > 0.2. */
  positiveRatio: number;
  /** Fraction of sessions with pad.v < -0.2. */
  negativeRatio: number;
  /** Fraction of sessions with pad.v in [-0.2, 0.2]. */
  neutralRatio: number;
  /**
   * 0..1 composite score. Rewards authentic negative expression (>5%),
   * penalises being stuck negative (>60%) or suppressed (<5% negative).
   */
  score: number;
  /** All pad positions with age 0=oldest..1=newest — use for VA scatter. */
  vaPoints: Array<{ v: number; a: number; age: number }>;
}

/** The full longitudinal summary returned to callers. */
export interface LongitudinalSummary {
  /** Total number of ratings in the input series. */
  sessionCount: number;
  /** Word cloud entries sorted by weight, empty array when no labels exist. */
  wordCloud: WordCloudEntry[];
  /** null when sessionCount < MIN_MOMENTUM (5). */
  inertia: InertiaSummary | null;
  /** null when no negative episode has ever been recorded. */
  resilience: ResilienceSummary | null;
  /** null when sessionCount < MIN_RANGE (5). */
  range: RangeSummary | null;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Aggregate a collection of Rating objects into the three longitudinal
 * signals plus a word cloud. Input order does not matter — sorted internally
 * by timestamp. Pure function; safe to call on every render.
 */
export function computeLongitudinalSummary(ratings: Rating[]): LongitudinalSummary {
  const sorted = [...ratings].sort((a, b) => a.timestamp - b.timestamp);
  const n = sorted.length;

  return {
    sessionCount: n,
    wordCloud:    _wordCloud(sorted),
    inertia:      n >= MIN_MOMENTUM ? _inertia(sorted) : null,
    resilience:   _resilience(sorted),
    range:        n >= MIN_RANGE    ? _range(sorted)    : null,
  };
}

// ─── Internal helpers ──────────────────────────────────────────────────────

function _wordCloud(ratings: Rating[]): WordCloudEntry[] {
  const allW    = new Map<string, number>();
  const recentW = new Map<string, number>();
  const recentStart = Math.floor(ratings.length * (1 - RECENT_FRAC));

  ratings.forEach((r, i) => {
    for (const { name, level } of r.labels) {
      allW.set(name, (allW.get(name) ?? 0) + level);
      if (i >= recentStart) {
        recentW.set(name, (recentW.get(name) ?? 0) + level);
      }
    }
  });

  const recentSessions = Math.max(1, ratings.length - recentStart);
  const allSessions    = Math.max(1, ratings.length);

  return [...allW.entries()]
    .map(([name, weight]) => {
      const overallRate = weight / allSessions;
      const recentRate  = (recentW.get(name) ?? 0) / recentSessions;
      const ratio = recentRate / (overallRate + 0.001);
      const trend: WordCloudEntry['trend'] =
        ratio > 1.35 ? 'rising' : ratio < 0.65 ? 'falling' : 'stable';
      return { name, weight, trend };
    })
    .sort((a, b) => b.weight - a.weight);
}

function _inertia(ratings: Rating[]): InertiaSummary {
  // Mean euclidean shift in VA space between consecutive sessions.
  // Divide by √2 to normalise: max possible shift across the unit square.
  let shiftSum = 0;
  for (let i = 1; i < ratings.length; i++) {
    const p = ratings[i - 1]!.pad;
    const c = ratings[i]!.pad;
    shiftSum += Math.hypot(c.v - p.v, c.a - p.a) / Math.SQRT2;
  }
  const meanShift = shiftSum / (ratings.length - 1);
  // Scale: 0.25 mean shift ≈ moderate movement → score ~0.5
  const score = Math.min(1, meanShift / 0.5);

  let stuckStreak = 0;
  for (let i = ratings.length - 1; i >= 0; i--) {
    if (ratings[i]!.pad.v < STUCK_V) stuckStreak++;
    else break;
  }

  return {
    score,
    stuckStreak,
    isCurrentlyStuck: stuckStreak >= STUCK_MIN,
    sparkline: ratings.map(r => r.pad.v),
  };
}

function _resilience(ratings: Rating[]): ResilienceSummary | null {
  const arcs: RecoveryArc[] = [];
  let i = 0;

  while (i < ratings.length) {
    if (ratings[i]!.pad.v >= STUCK_V) { i++; continue; }

    // Entered a negative episode at index i.
    const startIndex = i;
    let j = i + 1;
    while (j < ratings.length && ratings[j]!.pad.v < RECOVER_V) j++;

    if (j < ratings.length) {
      arcs.push({ startIndex, recoveredAtIndex: j, lengthSessions: j - startIndex });
      i = j + 1;
    } else {
      // Ongoing — no recovery yet.
      arcs.push({ startIndex, recoveredAtIndex: null, lengthSessions: null });
      break;
    }
  }

  if (arcs.length === 0) return null;

  const completed = arcs.filter(a => a.lengthSessions !== null);
  const avgRecoverySessions =
    completed.length > 0
      ? completed.reduce((s, a) => s + a.lengthSessions!, 0) / completed.length
      : null;
  const last = completed.at(-1);

  return {
    avgRecoverySessions,
    lastRecoveryLength: last?.lengthSessions ?? null,
    arcs,
  };
}

function _range(ratings: Rating[]): RangeSummary {
  const POS = 0.2;
  let pos = 0, neg = 0, neu = 0;

  for (const r of ratings) {
    if      (r.pad.v >  POS) pos++;
    else if (r.pad.v < -POS) neg++;
    else                     neu++;
  }

  const n = ratings.length;
  const positiveRatio = pos / n;
  const negativeRatio = neg / n;
  const neutralRatio  = neu / n;

  // Score rewards authentic negative range (5%–50%) and penalises extremes.
  const hasNeg   = negativeRatio >= 0.05;       // suppression flag
  const notStuck = negativeRatio <= 0.60;       // stuck-negative flag
  const balance  = 1 - Math.abs(positiveRatio - 0.55); // mild positive bias is healthy
  const raw = Math.max(0, balance) * (hasNeg ? 1 : 0.45) * (notStuck ? 1 : 0.5);
  const score = Math.min(1, Math.max(0, raw));

  const vaPoints = ratings.map((r, i) => ({
    v: r.pad.v,
    a: r.pad.a,
    age: ratings.length > 1 ? i / (ratings.length - 1) : 1,
  }));

  return { positiveRatio, negativeRatio, neutralRatio, score, vaPoints };
}
