import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { FaceNearestExtractor } from '../src/extract/face-nearest.ts';
import { LexiconExtractor } from '../src/extract/lexicon.ts';
import { WorkersAiExtractor, type AiRunner } from '../src/extract/workers-ai.ts';
import { OutputError } from '../src/errors.ts';
import { finalize } from '../src/policy.ts';
import { PhraseSafetyScreen } from '../src/safety/phrase-screen.ts';
import type { FeelingExtractor } from '../src/ports.ts';
import { groundedCount, parseFeelingCases, parseSafetyCases, percentile, scoreCase, summarize, summarizeSafety, type CaseScore, type FeelingCase, type RunSummary } from './scoring.ts';

/**
 * The feelings eval (docs/checkin/evals.md § 6):
 *
 *   pnpm --filter @affect-kit/checkin-core eval feelings [--extractors a,b,…] [--ablation] [--only id,id] [--gateway <id>] [--baseline]
 *   pnpm --filter @affect-kit/checkin-core eval safety
 *
 * Extractors: face-nearest, lexicon, or workers-ai:<model id>, e.g.
 * workers-ai:@cf/meta/llama-3.3-70b-instruct-fp8-fast. --ablation also runs each
 * extractor without the face. --baseline rewrites evals/baseline.md.
 *
 * Workers AI runs through Wrangler's platform proxy (wrangler.eval.jsonc), so
 * the harness runs the same adapter the Worker binds. The cases are synthetic;
 * reports go to evals/reports/ (gitignored, one per run).
 */
const HERE = fileURLToPath(new URL('./', import.meta.url));

/** Workers AI prices per million tokens, input and output, checked 2026-10-05 (docs/checkin/evals.md § 5). */
const PRICES: Record<string, [number, number]> = {
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast': [0.293, 2.253],
  '@cf/meta/llama-4-scout-17b-16e-instruct': [0.27, 0.85],
  '@cf/openai/gpt-oss-120b': [0.35, 0.75],
  '@cf/openai/gpt-oss-20b': [0.2, 0.3],
  '@cf/qwen/qwen3-30b-a3b-fp8': [0.051, 0.335],
  '@cf/qwen/qwen3.8-27b': [0.45, 3.2],
  '@cf/google/gemma-4-26b-a4b-it': [0.1, 0.3],
  '@cf/mistralai/mistral-small-3.1-24b-instruct': [0.351, 0.555],
};

type Args = Record<string, string | true>;
function parseArgs(argv: string[]): { suite: string; args: Args } {
  const [suite = 'feelings', ...rest] = argv;
  const args: Args = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (!arg.startsWith('--')) continue;
    const next = rest[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      args[arg.slice(2)] = next;
      i++;
    } else args[arg.slice(2)] = true;
  }
  return { suite, args };
}

interface CaseResult {
  id: string;
  ok: boolean;
  /** Attempts beyond the first: transient errors are retried twice, an unreadable answer once. */
  retries: number;
  error?: string;
  ms: number;
  inputTokens: number | null;
  outputTokens: number | null;
  grounded: number;
  proposed: number;
  final: { name: string; level: number; evidence: string; confidence: number }[];
  unmatched: string[];
  score: CaseScore;
}

interface ExtractorRun {
  extractor: string;
  model: string | null;
  face: boolean;
  summary: RunSummary;
  errors: number;
  retried: number;
  p50: number | null;
  p95: number | null;
  costPer1000: number | null;
  groundedRate: number | null;
  results: CaseResult[];
}

async function pool<T, R>(items: readonly T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

/**
 * Workers AI sometimes answers "internal error" under load: retried twice, with
 * backoff. An unreadable answer gets one retry (the decision rule allows one,
 * evals.md § 7). Every retry is counted in the report, so flakiness stays visible.
 */
async function withRetries<T>(fn: () => Promise<T>, onRetry: (attempts: number) => void): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= (error instanceof OutputError ? 1 : 2)) throw error;
      onRetry(attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, 1500 * 3 ** attempt));
    }
  }
}

async function evaluate(extractor: FeelingExtractor, model: string | null, cases: FeelingCase[], useFace: boolean, concurrency: number): Promise<ExtractorRun> {
  const retried: Record<string, number> = {};
  const results = await pool(cases, concurrency, async (c): Promise<CaseResult> => {
    const started = Date.now();
    try {
      const proposal = await withRetries(() => extractor.extract({ text: c.text, face: useFace ? c.face : null }), (n) => (retried[c.id] = n));
      // The face-nearest baseline reads no text, so it has no evidence to check: score what it proposed.
      const final = model === null && extractor.id.startsWith('face-nearest') ? proposal : finalize(c.text, proposal);
      const { grounded, total } = groundedCount(c.text, proposal);
      return {
        id: c.id,
        ok: true,
        retries: retried[c.id] ?? 0,
        ms: proposal.meter?.ms ?? Date.now() - started,
        inputTokens: proposal.meter?.inputTokens ?? null,
        outputTokens: proposal.meter?.outputTokens ?? null,
        grounded,
        proposed: total,
        final: final.words,
        unmatched: final.unmatched.map((u) => u.said),
        score: scoreCase(c, final),
      };
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      return { id: c.id, ok: false, retries: retried[c.id] ?? 0, error: message.slice(0, 160), ms: Date.now() - started, inputTokens: null, outputTokens: null, grounded: 0, proposed: 0, final: [], unmatched: [], score: scoreCase(c, { words: [], unmatched: [] }) };
    }
  });

  const ok = results.filter((r) => r.ok);
  const proposed = ok.reduce((t, r) => t + r.proposed, 0);
  const price = model ? PRICES[model] : undefined;
  const metered = ok.filter((r) => r.inputTokens !== null && r.outputTokens !== null);
  const costPer1000 =
    price && metered.length
      ? (1000 * metered.reduce((t, r) => t + (r.inputTokens! * price[0] + r.outputTokens! * price[1]) / 1e6, 0)) / metered.length
      : model
        ? null
        : 0;
  return {
    extractor: extractor.id,
    model,
    face: useFace,
    summary: summarize(results.map((r) => r.score)),
    errors: results.length - ok.length,
    retried: results.filter((r) => r.retries > 0).length,
    p50: model ? percentile(ok.map((r) => r.ms), 50) : null,
    p95: model ? percentile(ok.map((r) => r.ms), 95) : null,
    costPer1000,
    groundedRate: proposed ? ok.reduce((t, r) => t + r.grounded, 0) / proposed : null,
    results,
  };
}

// ── Output ─────────────────────────────────────────────────────────────────────

const pct = (n: number | null) => (n === null ? '–' : `${Math.round(n * 100)}%`);
const dec = (n: number | null, d = 2) => (n === null ? '–' : n.toFixed(d));

function table(runs: ExtractorRun[]): string {
  const head = '| Extractor | Face | F1 | Precision | Recall | Exact | Level exact | Far misses | Words / case (expected) | Events-only with words | Forbidden | Evidence in text | Their words found | Errors (retried) | p50 / p95 ms | $ / 1,000 |';
  const rule = `|${'---|'.repeat(16)}`;
  const rows = runs.map((r) => {
    const s = r.summary;
    return `| ${r.extractor} | ${r.face ? 'yes' : 'no'} | ${dec(s.f1)} | ${pct(s.precision)} | ${pct(s.recall)} | ${pct(s.exactRate)} | ${pct(s.levelExactRate)} | ${s.farMisses} | ${dec(s.meanPredicted, 1)} (${dec(s.meanSlots, 1)}) | ${s.eventsOnlyWithWords.count} of ${s.eventsOnlyWithWords.of} | ${s.forbiddenCases.length} | ${pct(r.groundedRate)} | ${pct(s.unmatchedRecall)} | ${r.errors} (${r.retried}) | ${r.p50 ?? '–'} / ${r.p95 ?? '–'} | ${r.costPer1000 === null ? '–' : `$${r.costPer1000.toFixed(3)}`} |`;
  });
  return [head, rule, ...rows].join('\n');
}

function misses(run: ExtractorRun, cases: FeelingCase[]): string {
  const lines = run.results
    .filter((r) => !r.ok || !r.score.exact || r.score.forbidden.length > 0)
    .map((r) => {
      const c = cases.find((x) => x.id === r.id)!;
      const expected = c.expected.map((s) => `${s.any.join('/')}${s.level ? ` ${s.level}` : ''}`).join(', ') || 'nothing';
      const got = r.ok ? r.final.map((w) => `${w.name} ${w.level}`).join(', ') || 'nothing' : `error (${r.error})`;
      const flags = [r.score.forbidden.length ? `**forbidden: ${r.score.forbidden.join(', ')}**` : '', r.unmatched.length ? `their words: ${r.unmatched.join(', ')}` : ''].filter(Boolean).join('; ');
      return `- \`${r.id}\` "${c.text.length > 90 ? `${c.text.slice(0, 87)}…` : c.text}" expected ${expected}; got ${got}${flags ? `; ${flags}` : ''}`;
    });
  return lines.length ? lines.join('\n') : '- none';
}

function tagTable(runs: ExtractorRun[]): string {
  const tags = [...new Set(runs.flatMap((r) => Object.keys(r.summary.byTag)))].sort();
  const head = `| Tag | ${runs.map((r) => `${r.extractor.replace(/\/feelings-v\d+$/, '')}${r.face ? '' : ' (no face)'}`).join(' | ')} |`;
  const rule = `|---|${runs.map(() => '---|').join('')}`;
  const rows = tags.map((tag) => `| ${tag} (${runs[0]!.summary.byTag[tag]?.cases ?? 0}) | ${runs.map((r) => dec(r.summary.byTag[tag]?.f1 ?? null)).join(' | ')} |`);
  return [head, rule, ...rows].join('\n');
}

function report(runs: ExtractorRun[], cases: FeelingCase[], when: string): string {
  return `# Feelings eval — ${when}

${cases.length} hand-written cases (\`evals/feelings/cases.json\`, labels: ${[...new Set(cases.map((c) => c.labelledBy))].join(', ')}). Metrics: docs/checkin/evals.md § 3. Scores are after the policy (what the person would see); "Evidence in text" is before it.

${table(runs)}

## F1 by tag

${tagTable(runs)}

## Misses, by extractor

${runs.map((r) => `### ${r.extractor}${r.face ? '' : ' (no face)'}\n\n${misses(r, cases)}`).join('\n\n')}
`;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function openAi(): Promise<{ ai: AiRunner; dispose: () => Promise<void> }> {
  const { getPlatformProxy } = await import('wrangler');
  const proxy = await getPlatformProxy<{ AI: unknown }>({ configPath: `${HERE}wrangler.eval.jsonc`, persist: false });
  return { ai: proxy.env.AI as AiRunner, dispose: () => proxy.dispose() };
}

async function feelings(args: Args) {
  let cases = parseFeelingCases(JSON.parse(await readFile(`${HERE}feelings/cases.json`, 'utf8')));
  const only = typeof args.only === 'string' ? args.only.split(',') : null;
  if (only) cases = cases.filter((c) => only.includes(c.id));
  const specs = (typeof args.extractors === 'string' ? args.extractors : 'face-nearest,lexicon').split(',').map((s) => s.trim());
  const gatewayId = typeof args.gateway === 'string' ? args.gateway : undefined;
  const concurrency = Number(typeof args.concurrency === 'string' ? args.concurrency : 4);

  const needsAi = specs.some((s) => s.startsWith('workers-ai:'));
  const platform = needsAi ? await openAi() : null;
  try {
    const runs: ExtractorRun[] = [];
    for (const spec of specs) {
      const model = spec.startsWith('workers-ai:') ? spec.slice('workers-ai:'.length) : null;
      const extractor: FeelingExtractor =
        spec === 'face-nearest' ? new FaceNearestExtractor() : spec === 'lexicon' ? new LexiconExtractor() : model ? new WorkersAiExtractor(platform!.ai, model, gatewayId ? { gatewayId } : {}) : (() => { throw new Error(`Unknown extractor "${spec}"`); })();
      for (const useFace of args.ablation ? [true, false] : [true]) {
        if (!useFace && spec === 'face-nearest') continue;
        process.stdout.write(`… ${extractor.id}${useFace ? '' : ' (no face)'}\n`);
        runs.push(await evaluate(extractor, model, cases, useFace, model ? concurrency : 1));
      }
    }

    const when = new Date().toISOString().slice(0, 16).replace('T', ' ');
    console.log(`\n${table(runs)}\n`);
    const markdown = report(runs, cases, when);
    await mkdir(`${HERE}reports`, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    await writeFile(`${HERE}reports/${stamp}-feelings.md`, markdown);
    await writeFile(`${HERE}reports/${stamp}-feelings.json`, JSON.stringify(runs, null, 2));
    if (args.baseline) await writeFile(`${HERE}baseline.md`, markdown);
    console.log(`Report: evals/reports/${stamp}-feelings.md${args.baseline ? ' (and evals/baseline.md)' : ''}`);
  } finally {
    await platform?.dispose();
  }
}

async function safety() {
  const cases = parseSafetyCases(JSON.parse(await readFile(`${HERE}safety/cases.json`, 'utf8')));
  const screen = new PhraseSafetyScreen();
  const summary = summarizeSafety(cases, (c) => screen.screen(c.text).show);
  console.log(`${screen.id}: recall ${pct(summary.recall)} (${cases.filter((c) => c.show === true).length} crisis cases), false positives ${pct(summary.falsePositiveRate)}`);
  console.log(`misses: ${summary.misses.join(', ') || 'none'}\nfalse positives: ${summary.falsePositives.join(', ') || 'none'}`);
  if (summary.misses.length) process.exitCode = 1;
}

const { suite, args } = parseArgs(process.argv.slice(2));
if (suite === 'feelings') await feelings(args);
else if (suite === 'safety') await safety();
else {
  console.error('Usage: pnpm eval feelings|safety [options]');
  process.exitCode = 1;
}
