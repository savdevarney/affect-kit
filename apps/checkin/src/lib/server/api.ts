import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { CheckinService } from '@affect-kit/checkin-core/service';
import { CheckinError, CheckinInputSchema, LocalDateSchema, ReviewInputSchema } from '@affect-kit/checkin-core';
import { requestContainer } from './container.ts';
import type { Env } from './env.ts';

type Variables = { userId: string; checkins: CheckinService };

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Who's asking: the trust boundary. Local dev acts as DEV_USER_ID, and only for
 * requests to localhost, so a leftover var can't open a deployed Worker. A
 * deployed Worker answers 401 until sign-in lands (Cloudflare Access first;
 * docs/checkin/privacy.md › Accounts).
 */
function userIdFor(request: Request, env: Env | undefined): string | null {
  const host = new URL(request.url).hostname;
  return env?.DEV_USER_ID && LOCAL_HOSTS.has(host) ? env.DEV_USER_ID : null;
}

/**
 * The one public API. Routes validate with the core's own Zod schemas and hand
 * off to CheckinService; Hono's RPC types carry the shapes to the client
 * (src/lib/api.ts) with no codegen.
 */
export const api = new Hono<{ Bindings: Env; Variables: Variables }>()
  .basePath('/api')
  .use('*', async (c, next) => {
    const userId = userIdFor(c.req.raw, c.env);
    if (!userId) return c.json({ error: 'Sign in to check in' }, 401);
    c.set('userId', userId);
    c.set('checkins', requestContainer(c.env).resolve(CheckinService));
    await next();
    // Personal data: never cached anywhere.
    c.header('Cache-Control', 'no-store');
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
    if (error instanceof CheckinError) return c.json({ error: error.message }, error.code === 'NOT_FOUND' ? 404 : 400);
    // The path and the error's kind only: request bodies hold someone's words.
    console.error('api error', { path: c.req.path, name: error.name });
    return c.json({ error: 'Something went wrong' }, 500);
  });

export type Api = typeof api;
