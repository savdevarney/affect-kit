import { z } from 'zod';
import { OutputError } from '../errors.ts';
import { isEmotionName } from '../vocabulary.ts';
import { OUTPUT_SCHEMA, PROMPT_VERSION, SYSTEM_PROMPT, userPrompt } from './prompt.ts';
import type { CallMeter, Extraction, Face, FeelingExtractor, FoundWord, Level, UnmatchedWord } from '../ports.ts';

/**
 * The slice of the Workers AI binding this adapter uses. `env.AI` fits it, so
 * the core never imports Cloudflare types; the eval harness passes the same
 * binding through Wrangler's platform proxy.
 */
export interface AiRunner {
  run(model: string, inputs: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
}

/**
 * How each model takes a JSON schema. Workers AI has two `response_format`
 * shapes, and some models take `guided_json` instead. Read from each model's
 * input schema (2026-10-05): the JSON mode docs page lists only six models,
 * four of them deprecated.
 */
export type JsonShape = 'legacy' | 'openai' | 'guided';
export const JSON_SHAPES: Readonly<Record<string, JsonShape>> = {
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast': 'legacy',
  '@cf/meta/llama-4-scout-17b-16e-instruct': 'legacy',
  '@cf/openai/gpt-oss-120b': 'legacy',
  '@cf/openai/gpt-oss-20b': 'legacy',
  '@cf/qwen/qwen3-30b-a3b-fp8': 'legacy',
  '@cf/qwen/qwen3.8-27b': 'openai',
  '@cf/google/gemma-4-26b-a4b-it': 'openai',
  '@cf/mistralai/mistral-small-3.1-24b-instruct': 'guided',
};

/**
 * An LLM on Workers AI, behind the FeelingExtractor port. Calls go through
 * AI Gateway when a gateway id is set, with logging off for the request
 * (`collectLog: false`): the binding has no payload-only switch, so the run's
 * own meter is where cost and time are recorded.
 */
export class WorkersAiExtractor implements FeelingExtractor {
  readonly id: string;

  constructor(
    private readonly ai: AiRunner,
    private readonly model: string,
    private readonly options: { gatewayId?: string; shape?: JsonShape } = {},
  ) {
    this.id = `workers-ai/${model.replace(/^@cf\//, '')}/${PROMPT_VERSION}`;
  }

  async extract(input: { text: string; face: Face | null }): Promise<Extraction & { meter: CallMeter }> {
    const started = Date.now();
    const result = await this.ai.run(this.model, this.inputs(input), this.options.gatewayId ? { gateway: { id: this.options.gatewayId, collectLog: false } } : {});
    const meter: CallMeter = { ms: Date.now() - started, ...usage(result) };
    return { ...parseOutput(responseBody(result)), meter };
  }

  private inputs(input: { text: string; face: Face | null }): Record<string, unknown> {
    const shape = this.options.shape ?? JSON_SHAPES[this.model] ?? 'legacy';
    const format =
      shape === 'guided'
        ? { guided_json: OUTPUT_SCHEMA }
        : shape === 'openai'
          ? { response_format: { type: 'json_schema', json_schema: { name: 'feelings', schema: OUTPUT_SCHEMA, strict: true } } }
          : { response_format: { type: 'json_schema', json_schema: OUTPUT_SCHEMA } };
    return {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt(input.text, input.face) },
      ],
      max_tokens: 700,
      temperature: 0,
      ...format,
    };
  }
}

/** The model's answer, from whichever envelope it came in: Workers AI's `response`, OpenAI's `choices`, or a Responses-style `output`. */
export function responseBody(result: unknown): unknown {
  const r = result as {
    response?: unknown;
    choices?: { message?: { content?: unknown } }[];
    output?: { type?: string; content?: { type?: string; text?: string }[] }[];
  };
  if (r?.response !== undefined && r.response !== null) return r.response;
  const content = r?.choices?.[0]?.message?.content;
  if (content !== undefined) return content;
  const text = r?.output?.flatMap((o) => o.content ?? []).find((c) => c.type === 'output_text')?.text;
  if (text !== undefined) return text;
  throw new OutputError('No answer in the model response');
}

function usage(result: unknown): Pick<CallMeter, 'inputTokens' | 'outputTokens'> {
  const u = (result as { usage?: Record<string, unknown> })?.usage ?? {};
  const n = (value: unknown) => (typeof value === 'number' ? value : null);
  return { inputTokens: n(u.prompt_tokens) ?? n(u.input_tokens), outputTokens: n(u.completion_tokens) ?? n(u.output_tokens) };
}

const Envelope = z.object({ words: z.array(z.unknown()), unmatched: z.array(z.unknown()).default([]) });
const clampLevel = (n: number): Level => (n <= 1 ? 1 : n >= 3 ? 3 : 2);
const Word = z.object({
  name: z.string().refine(isEmotionName),
  level: z.number().transform((n) => clampLevel(Math.round(n))),
  evidence: z.string().min(1),
  confidence: z.number().transform((n) => Math.min(1, Math.max(0, n))),
});
const Unmatched = z.object({ said: z.string().min(1), evidence: z.string().min(1) });

/**
 * Parse and validate the model's answer. A broken envelope is an error (the
 * run is recorded as invalid output); a single bad item is dropped, so one
 * stray word doesn't cost the whole answer.
 */
export function parseOutput(body: unknown): Extraction {
  const json = typeof body === 'string' ? parseJsonText(body) : body;
  const envelope = Envelope.safeParse(json);
  if (!envelope.success) throw new OutputError('The answer is not the expected shape');
  const words = envelope.data.words.flatMap((item) => {
    const parsed = Word.safeParse(item);
    return parsed.success ? [parsed.data as FoundWord] : [];
  });
  const unmatched = envelope.data.unmatched.flatMap((item) => {
    const parsed = Unmatched.safeParse(item);
    return parsed.success ? [parsed.data as UnmatchedWord] : [];
  });
  return { words, unmatched };
}

/** Models sometimes wrap JSON in prose, code fences or a reasoning preamble. */
function parseJsonText(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new OutputError('No JSON in the answer');
  try {
    return JSON.parse(match[0]);
  } catch {
    throw new OutputError('The answer is not valid JSON');
  }
}
