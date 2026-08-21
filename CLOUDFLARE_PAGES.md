# Cloudflare Pages deployment — V16

The site is intentionally static and does not require a framework, Node.js, a backend, a database, Pages Functions, or Workers.

## Recommended Pages settings

- Production branch: `main` after V16 is merged
- Framework preset: None
- Build command: leave empty
- Build output directory: repository root (`/`)
- Root directory: repository root
- Environment variables: none required

## Release flow

1. Keep `main` on the last stable release while V16 is tested in `v16` / PR #1.
2. Put the eleven licensed WOFF2 files under `assets/fonts/` and run `python tools/verify-v16-assets.py` locally.
3. Complete `V16_QA.md`.
4. Merge PR #1 into `main`.
5. Point Cloudflare Pages to the GitHub repository and production branch `main`.
6. A new commit on `main` can then trigger a static Pages deployment without a build command.

## Offline parity

Cloudflare serves the same files that can be opened locally. V16 does not depend on a remote API/CDN at runtime. Data is shipped as local JavaScript chunks and avatar/font paths are relative.

The optional `_headers` file only affects HTTP hosting on Cloudflare Pages; it does not change direct local-file behavior.
