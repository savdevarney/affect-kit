# Check-in

A reference app on affect-kit: drag the face to how you feel, say a few words, and see the feeling words found in them, as chips you can change. Saved check-ins show on a day view.

The design, the evals and the rules it keeps are in [docs/checkin](../../docs/checkin/README.md). The logic lives in [`@affect-kit/checkin-core`](../../packages/checkin-core); this app is the UI, the API and the database.

## Run it locally

```bash
pnpm install
pnpm --filter affect-kit build                   # the app uses the package's build
cp apps/checkin/.dev.vars.example apps/checkin/.dev.vars   # who you are locally; never deployed
pnpm --filter @affect-kit/checkin db:migrate     # local D1
pnpm --filter @affect-kit/checkin dev            # http://localhost:5277
```

It runs offline by default:
- `EXTRACTOR_MODEL` is empty in `wrangler.jsonc`, so the lexicon finds the words and no model is called. The review step says "Found with simple word matching".
- You're signed in as `DEV_USER_ID`, from `.dev.vars`. It's never deployed, and the API honors it only for callers on this machine: it checks the client's address, not the host name, which anyone can set.

To try a model, set `EXTRACTOR_MODEL` to a Workers AI id, for example `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. The AI binding is remote even in local dev, so this needs `wrangler login`, and the calls are billed. Pick models with the evals (`pnpm --filter @affect-kit/checkin-core eval feelings`), not here.

## Tests

```bash
pnpm --filter @affect-kit/checkin test        # D1 repository against a local D1
pnpm --filter @affect-kit/checkin test:e2e    # Playwright: the check-in flow, the crisis panel, the week prototype
```

## Pieces

| Where | What |
|---|---|
| `src/routes/+page.svelte` | The check-in: face (`<affect-kit-rater face-only>`), words, review |
| `src/routes/day/[[date]]` | A day as it was logged |
| `src/routes/prototypes/weeks` | The word calendar, on synthetic data only |
| `src/routes/api/[...path]` | Hands `/api/*` to the Hono app |
| `src/lib/server/api.ts` | The API: routes, validation, the trust boundary |
| `src/lib/server/container.ts` | The composition root: a TSyringe child container per request |
| `src/lib/server/d1-repository.ts` | The repository port on D1 |
| `migrations/` | The schema |

## Before anyone else uses it

Not deployed, and not ready for other people's data. Before that, in this order:
1. Sign-in: Cloudflare Access for a private deploy first.
2. Create the D1 database in the US jurisdiction (`wrangler d1 create checkin --jurisdiction us`) and put its id in `wrangler.jsonc`.
3. An AI Gateway with logs off.
4. The privacy page from [docs/checkin/privacy.md](../../docs/checkin/privacy.md).
5. Settle the NRC VAD licence ([docs/checkin/README.md](../../docs/checkin/README.md) › Decisions).
