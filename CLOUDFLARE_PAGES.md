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
3. Let GitHub Actions run the three V16 gates:
   - Static/offline sanity
   - Browser smoke — direct `file://` mode
   - V16 asset verification
4. Complete the remaining typography items in `V16_QA.md`.
5. Merge PR #1 into `main` only after the required asset gate is green.
6. Connect Cloudflare Pages to this GitHub repository and use production branch `main`.
7. A new commit on `main` can then trigger a static Pages deployment without a build command.

## What is already continuously tested

The browser smoke job opens `index.html` directly from disk in headless Chrome. It exercises professor data boot, search, faculty/department/course filters, sorting, professor drawer, local saved-state persistence, comparison modal, dark/light theme, narrow mobile viewport, reduced-motion behavior and the local Professor Scout runtime assets. The test does not start a web server.

## Offline parity

Cloudflare serves the same files that can be opened locally. V16 does not depend on a remote API/CDN at runtime. Data is shipped as local JavaScript chunks and avatar/font paths are relative.

The optional `_headers` file only affects HTTP hosting on Cloudflare Pages; it does not change direct local-file behavior.

## Final production check

After Cloudflare Pages is connected, repeat a short production check against the generated `pages.dev` URL: initial render, one search, one professor drawer, one comparison and both desktop/mobile viewport checks. That hosting check is intentionally kept outside the repository-only release gate because it depends on the user's Cloudflare account connection.
