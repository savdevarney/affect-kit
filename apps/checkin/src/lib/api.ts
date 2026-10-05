import { hc } from 'hono/client';
import type { CheckinInput, ReviewInput } from '@affect-kit/checkin-core';
// A type-only import: the server's code never reaches the browser, only its route types.
import type { Api } from './server/api.ts';

/**
 * The typed API client. Hono's RPC client reads request and response types
 * straight from the server's routes, like an Angular HttpClient whose types
 * can't drift from the backend, with no codegen step.
 */
const client = (fetcher: typeof fetch) => hc<Api>(location.origin, { fetch: fetcher }).api;

export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`The server answered ${status}`);
  }
}

export async function createCheckin(input: CheckinInput, fetcher = fetch) {
  const res = await client(fetcher).checkins.$post({ json: input });
  if (res.status !== 201) throw new ApiError(res.status);
  return res.json();
}

export async function reviewWords(id: string, input: ReviewInput, fetcher = fetch) {
  const res = await client(fetcher).checkins[':id'].words.$put({ param: { id }, json: input });
  if (res.status !== 200) throw new ApiError(res.status);
  return res.json();
}

export async function deleteCheckin(id: string, fetcher = fetch) {
  const res = await client(fetcher).checkins[':id'].$delete({ param: { id } });
  if (!res.ok) throw new ApiError(res.status);
}

export async function fetchDays(from: string, to: string, fetcher = fetch) {
  const res = await client(fetcher).days.$get({ query: { from, to } });
  if (res.status !== 200) throw new ApiError(res.status);
  return res.json();
}

export type Created = Awaited<ReturnType<typeof createCheckin>>;
export type Checkin = Awaited<ReturnType<typeof fetchDays>>[number];
