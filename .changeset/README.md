# Changesets

This folder is automatically managed by [changesets](https://github.com/changesets/changesets).

## Adding a changeset

When you change something publishable in `packages/affect-kit`, run:

```bash
pnpm changeset
```

Pick the bump type (patch/minor/major) and write a one-line summary. Commit the resulting `.md` file alongside your code changes. The release workflow handles publishing on merge to `main`.

Apps in `apps/*` and dev-only packages (`tsconfig`, `eslint-config`) are listed under `ignore` in `config.json` and don't need changesets.
