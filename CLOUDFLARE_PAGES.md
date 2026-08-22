# Cloudflare Pages deployment — V16

V16 is intentionally static. It does not require a framework, Node.js runtime, backend, database, Pages Functions or Workers.

There are two supported deployment paths depending on the font license.

## Path A — staged Direct Upload (recommended when font binaries should not live in the source repository)

This keeps proprietary WOFF2 binaries out of Git history while still producing the exact static site that Cloudflare should serve.

1. Keep the licensed source font archives in the repository root or `vendor-fonts/` **on the deployment machine only**. The archives are gitignored.
2. Run:

   ```bash
   python tools/stage-v16-release.py
   ```

3. The script creates `.release/v16/`, copies only runtime site files, extracts the exact eleven licensed WOFF2 files into the staged copy, verifies every size/SHA-256 value, and leaves the source checkout untouched.
4. Deploy the **contents of `.release/v16/`** with Cloudflare Pages Direct Upload. Do not upload the `.release` parent directory.
5. No build command or runtime environment variables are required by the site itself.

This is the preferred path when the font license permits normal webfont deployment but does not permit publishing raw font binaries in a public source repository.

## Path B — Git integration

Use this only if the applicable font license explicitly permits the WOFF2 files to be stored in the connected repository.

Recommended Pages settings:

- Production branch: `main` after V16 is merged
- Framework preset: None
- Build command: leave empty
- Build output directory: repository root (`/`)
- Root directory: repository root
- Environment variables: none required

Before merging, place the exact eleven manifest WOFF2 files under `assets/fonts/` and run:

```bash
python tools/verify-v16-assets.py
```

Then the GitHub Actions asset gate should become fully green and the browser test will additionally verify all four local font families.

## Release flow

1. Keep `main` on the last stable release while V16 is tested in `v16` / PR #1.
2. Complete source/static/avatar/browser QA.
3. Verify the selected font files against `assets/fonts/README.md` and `V16_FONT_QA.md`.
4. Choose Path A or Path B according to the actual webfont/repository distribution rights.
5. Complete the typography visual check using the same font binaries that will be deployed.
6. Merge PR #1 into `main` only when the chosen release path is reproducible and verified.
7. Deploy the exact release contents to Cloudflare Pages.
8. Repeat the short production smoke test against the resulting `pages.dev` URL.

## What is continuously tested

The browser smoke job opens `index.html` directly from disk in headless Chrome. It exercises professor data boot, search, faculty/department/course filters, sorting, professor drawer, local saved-state persistence, comparison modal, dark/light theme, narrow mobile viewport, reduced-motion behavior and repository-local Professor Scout assets. The test does not start a web server.

## Offline parity

Cloudflare serves the same static layout that can be opened locally. V16 does not depend on a remote API/CDN at runtime. Data ships as local JavaScript chunks and avatar/font URLs are relative.

The optional `_headers` file affects HTTP hosting only; it does not change direct `file://` behavior.

## Final production check

After deployment, verify: initial render, one search, one professor drawer, one comparison, font rendering/Persian digits, and desktop/mobile viewports.
