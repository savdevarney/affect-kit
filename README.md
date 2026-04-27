# affect-kit

Open-source web components for **dimensional emotion rating** — built with Lit, grounded in affective science.

- **npm package:** [`affect-kit`](https://www.npmjs.com/package/affect-kit)
- **Site + docs:** [affectkit.com](https://affectkit.com)
- **License:** MIT

## What's in the box

| Element | Role |
|---|---|
| `<affect-kit-rater>` | Interactive valence × arousal pad with optional emotion-label refinement |
| `<affect-kit-result>` | Display panel for a captured rating |
| `<affect-kit-face>` | Reusable face glyph driven by `v` and `a` |

## Why

The fundamental flow is **rate, then refine**: drag a face on a V/A pad to capture the gut feeling, then optionally tap labels to add nuance. This sequence respects the way affect actually works — feeling first, naming second — and produces a richer dataset than a single-dimension scale.

The default vocabulary is grounded in the [NRC VAD Lexicon](https://saifmohammad.com/WebPages/nrc-vad.html) (Mohammad 2018). The face glyph is intentionally minimal — no skin tone, no hair, no body — so it carries the rating without encoding race, gender, or age.

Read the longer [research foundations](docs/research.md) for the theoretical and design-principles background.

## Status

🚧 **Pre-release scaffold.** The monorepo and package skeleton are in place. Component implementations land in subsequent commits. Track progress at [github.com/savdevarney/affect-kit](https://github.com/savdevarney/affect-kit).

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
    ├── architecture.md            # component APIs, data flow, requirements
    ├── original-prompt.md         # original spec used to bootstrap the port
    └── nrc-vad-validation.md      # vocabulary validation plan
```

## Local development

```bash
# Node 22+, pnpm 10+
pnpm install
pnpm build           # build all packages
pnpm dev             # start the playground
pnpm test            # vitest unit + integration
pnpm test:visual     # playwright visual regression
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for monorepo conventions and [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.
