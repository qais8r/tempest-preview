# Agent instructions for The Tempest

## Publishing

- Public deployments must use the private `tempest-content` repository's `Publish website` workflow. It runs the production build and includes only records marked `published`.
- Preview builds are for local testing only. Never publish preview output or `dist/` by hand.
- Deploy the verified and pushed `main` commit. Do not change editorial publication statuses unless the user asks.

## Repository boundaries

- `main` contains source; `gh-pages` contains generated site output.
- The local `content/` directory contains public fixtures. Keep private `tempest-content` material out of commits, logs, and preview artifacts.
- Do not commit `dist/`, `src/generated/`, generated media, PDF assets, or cover caches to `main`.
- Use `BASE_PATH=/tempest-web` and the project's URL helpers for GitHub Pages paths.

## Verification

Before deployment, run:

```sh
npm test
npm run check
```

After deployment, verify the live homepage, an issue page, a work page, an author page, and a media asset. Do not treat a successful workflow alone as proof of a good deployment.

## Scope

Keep changes narrow, preserve unrelated working-tree edits, and commit or push only when the user asks.
