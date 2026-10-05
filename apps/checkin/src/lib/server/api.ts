import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { CheckinService } from '@affect-kit/checkin-core/service';
import { CheckinError, CheckinInputSchema, LocalDateSchema, ReviewInputSchema } from '@affect-kit/checkin-core';
import { requestContainer } from './container.ts';
import type { Env } from './env.ts';

type Variables = { userId: string; checkins: CheckinService };

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * Who's asking: the trust boundary. Local dev acts as DEV_USER_ID, which lives
 * in .dev.vars (so `wrangler deploy` never ships it), and only for callers on
 * this machine: the check is the client's address, not the host the request
 * names, which anyone can set. A deployed Worker answers 401 until sign-in
 * lands (Cloudflare Access first; docs/checkin/privacy.md › Accounts).
 */
function userIdFor(env: Env | undefined): string | null {
  return env?.DEV_USER_ID && env.CLIENT_ADDRESS && LOOPBACK.has(env.CLIENT_ADDRESS) ? env.DEV_USER_ID : null;
}

/**
 * The one public API. Routes validate with the core's own Zod schemas and hand
 * off to CheckinService; Hono's RPC types carry the shapes to the client
 * (src/lib/api.ts) with no codegen.
 */
export const api = new Hono<{ Bindings: Env; Variables: Variables }>()
  .basePath('/api')
  .use('*', async (c, next) => {
    const userId = userIdFor(c.env);
    if (!userId) return c.json({ error: 'Sign in to check in' }, 401);
    c.set('userId', userId);
    c.set('checkins', requestContainer(c.env).resolve(CheckinService));
    // Personal data: never cached anywhere.
    c.header('Cache-Control', 'no-store');
    await next();
  })
  .post('/checkins', zValidator('json', CheckinInputSchema), async (c) => c.json(await c.var.checkins.create(c.var.userId, c.req.valid('json')), 201))
  .put('/checkins/:id/words', zValidator('json', ReviewInputSchema), async (c) =>
    c.json(await c.var.checkins.review(c.var.userId, c.req.param('id'), c.req.valid('json'))),
  )
  .delete('/checkins/:id', async (c) => ((await c.var.checkins.delete(c.var.userId, c.req.param('id'))) ? c.json({ deleted: true }) : c.json({ error: 'No such check-in' }, 404)))
  .get('/days', zValidator('query', z.object({ from: LocalDateSchema, to: LocalDateSchema })), async (c) => {
    const { from, to } = c.req.valid('query');
    return c.json(await c.var.checkins.days(c.var.userId, from, to));
  })
  .onError((error, c) => {
    // Malformed JSON and the like: Hono's own 4xx, not a 500.
    if (error instanceof HTTPException) return error.getResponse();
    if (error instanceof CheckinError) return c.json({ error: error.message }, error.code === 'NOT_FOUND' ? 404 : error.code === 'CONFLICT' ? 409 : 400);
    // The path and the error's kind only: request bodies hold someone's words.
    console.error('api error', { path: c.req.path, name: error.name });
    return c.json({ error: 'Something went wrong' }, 500);
  });

export type Api = typeof api;
