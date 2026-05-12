# @affect-kit/site

Marketing and documentation site for affect-kit. Deploys to **[affectkit.com](https://affectkit.com)** via Cloudflare Pages.

**Pages:**
- `/` — homepage with live `<affect-kit-rater>` and component demos
- `/research` — affective-science foundations (canonical source for the science behind the package)
- `/docs` — full API reference with interactive controls for each component

**Stack:** Astro 6 + the local `affect-kit` workspace package. No CSS framework.

## Local development

```bash
# from the repo root
pnpm --filter @affect-kit/site dev    # http://localhost:4321
pnpm --filter @affect-kit/site build  # static output in dist/
```
