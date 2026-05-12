# affect-kit

Open-source web components for **dimensional emotion rating**. Built with Lit, grounded in affective science.

- **npm package:** [`affect-kit`](https://www.npmjs.com/package/affect-kit)
- **Site + docs:** [affectkit.com](https://affectkit.com)
- **License:** MIT

## What's in the box

| Element | Role |
|---|---|
| `<affect-kit-rater>`   | Interactive V/A pad with emotion-label refinement |
| `<affect-kit-result>`  | Display panel for a captured rating |
| `<affect-kit-compare>` | Two snapshots side-by-side, or two arrays averaged |
| `<affect-kit-face>`    | Reusable face glyph driven by `v` and `a` |

## How it works

Words are the measurement. The face sorts them.

Emotion science's most validated instrument is the labeled word. The NRC VAD Lexicon scores 20,000 of them on valence, arousal, and dominance. The hard part has never been the list; it's finding the right word in the moment.

affect-kit makes label selection a standardized act. A pre-verbal **gesture** orients you in V/A space and re-sorts the lexicon so the closest words rise first. You **refine** by tapping the ones that fit. A single **commit** writes a structured `Rating`.

The face glyph is intentionally minimal: no skin tone, no hair, no body. It carries the rating without encoding race, gender, or age. Read [research foundations](docs/research.md) for the full theoretical background.

## Repository layout

```
.
├── packages/
│   ├── affect-kit/                # the npm package
│   ├── tsconfig/                  # shared TS configs
│   └── eslint-config/             # shared lint config
├── apps/
│   ├── site/                      # affectkit.com (Astro on Cloudflare Pages)
│   ├── playground/                # local dev host (Vite)
│   └── harness/                   # framework integration test harnesses
│       ├── vanilla/  react/  vue/  sveltekit/  angular/  nextjs/
└── docs/
    ├── research.md                # affective science foundations
    ├── longitudinal-future.md     # roadmap for longitudinal features
    ├── nrc-vad-validation.md      # vocabulary validation plan
    └── original-prompt.md         # original spec used to bootstrap the port
```

## Local development

```bash
# Node 22+, pnpm 10+
pnpm install
pnpm --filter affect-kit build           # build the package
pnpm --filter @affect-kit/site dev       # run the marketing site
pnpm --filter affect-kit test            # vitest unit + integration
pnpm --filter affect-kit test:visual     # playwright visual regression
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for monorepo conventions and [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.
