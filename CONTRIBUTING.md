# Contributing to affect-kit

Thanks for your interest. The package is pre-release; the contribution process below will firm up before v1.0.

## Setup

```bash
git clone git@github.com:savdevarney/affect-kit.git
cd affect-kit
pnpm install
```

Requires Node 22+ and pnpm 10+.

## Workflow

1. Branch off `main` (use a short descriptive name).
2. Make your change. Keep commits in [Conventional Commits](https://www.conventionalcommits.org/) form: `feat:`, `fix:`, `docs:`, `chore:`.
3. If your change affects what `affect-kit` publishes, run `pnpm changeset` and pick the appropriate bump.
4. Run the local checks:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   ```
5. Open a PR against `main`.

## Scope

This project deliberately ships a **fixed** vocabulary and visual model. We do not accept PRs that:

- Add user-overridable vocabulary
- Add discrete emotion-category props
- Change the V/A → face mapping in ways that break the FACS-grounded design
- Add CSS frameworks (Tailwind etc.)

We do welcome PRs for:

- Bug fixes (especially cross-browser / SSR / accessibility)
- Additional language vocabularies sourced from validated multilingual lexicons (NRC has ~100 languages)
- Performance improvements
- Documentation
- Framework integration improvements
- New harnesses for additional frameworks/runtimes

## Affective-science changes

If your change affects vocabulary V/A/D values, the face glyph anatomy, color quadrant mapping, or any other element grounded in the [research foundations](docs/research.md), include the citation supporting your change in the PR description. We're not gatekeeping casually-justified changes to peer-reviewed mappings.

## Code of conduct

Be kind. We follow the [Contributor Covenant](https://www.contributor-covenant.org/) v2.1.
