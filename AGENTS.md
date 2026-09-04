# Agent instructions for The Tempest

## Deployment modes

This project has two different deployment paths. Choose the path from the user's request.

### Code and design preview

Use this path when the user asks to deploy website code, a visual change, or a design preview and expects the sample works and authors to remain visible.

- Build with `npm run build:preview`. This includes draft records.
- Publish the generated `dist/` directory to the public repository's `gh-pages` branch.
- Use the content from the private `tempest-content` repository when the user asks for the real editorial content.
- Do not trigger `tempest-content`'s `Publish website` workflow for this path. That workflow runs `npm run build`, which excludes drafts and removes the sample work and author routes.
- Treat preview content as public. Do not include private or unfinished editorial material unless the user explicitly approves that exposure.

### Approved editorial publication

Use this path only when the user asks to publish approved editorial content.

- Trigger `tempest-content`'s `Publish website` workflow.
- It uses `npm run build` and includes only records marked `published`.
- Do not change content statuses in `tempest-content` as part of a code deployment unless the user explicitly asks.

## Source and generated files

- `main` contains source code.
- `gh-pages` contains generated site output only.
- Deploy the exact `main` commit that was verified and pushed.
- Do not commit `dist/`, `src/generated/`, generated media, PDF assets, or cover caches to `main`.
- Use `BASE_PATH=/tempest-web` for GitHub Pages builds and the project's URL helpers for internal links and assets.

## Required checks

Before deploying a code change, run:

```sh
npm test
npm run check
CONTENT_DIR=/absolute/path/to/tempest-content/content \
  SITE_URL=https://qais8r.github.io \
  BASE_PATH=/tempest-web \
  npm run build:preview
```

After deployment, verify the live homepage, an issue page, a work page, an author page, and at least one media asset. A green workflow alone is not enough. Check that the expected sample works and authors are present when this is a design preview.

## Content boundaries

- The local `content/` directory is public fixture content.
- `tempest-content` is the private editorial repository.
- Do not copy private content into commits, logs, or public artifacts by accident.
- The preview and production builds intentionally produce different sites. Confirm the build mode before reporting deployment success.

## Scope

Keep changes narrow. Preserve unrelated working-tree edits. Commit and push only when the user asks.
