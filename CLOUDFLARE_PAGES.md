# Cloudflare Pages deployment — V16

V16 is intentionally static. It does not require a framework, Node.js runtime, backend, database, Pages Functions or Workers.

There are two supported deployment paths depending on the font license.

## Path A — staged Direct Upload (recommended when font binaries should not live in the source repository)

This keeps proprietary WOFF2 binaries out of Git history while still producing the exact static site that Cloudflare should serve.

> **Cloudflare project-type note:** Direct Upload and Git integration are separate Pages project types. Cloudflare's current Pages documentation states that a Direct Upload project cannot later be switched to Git integration; moving to Git integration requires creating a new Pages project. Choose the project type deliberately.

1. Keep the licensed source font archives in the repository root or `vendor-fonts/` **on the deployment machine only**. The archives are gitignored.
2. Run:

   ```bash
   python tools/stage-v16-release.py
   ```

3. The script creates `.release/v16/`, copies only runtime site files, extracts the exact eleven licensed WOFF2 files into the staged copy, verifies every size/SHA-256 value, and leaves the source checkout untouched.
4. In the Cloudflare dashboard open **Workers & Pages → Create application → Pages / Direct Upload (drag and drop)**.
5. Enter the Pages project name and upload the **contents of `.release/v16/`** (or the staged folder itself where the UI accepts a folder). Do not upload the `.release` parent directory.
6. Select **Deploy site** / **Save and Deploy**.
7. No build command or runtime environment variables are required by the site itself.

Cloudflare also supports Direct Upload through Wrangler. For a folder that has already been staged and strictly verified:

```bash
npx wrangler pages project create <PROJECT_NAME>
npx wrangler pages deploy .release/v16 --project-name=<PROJECT_NAME>
```

Wrangler uploads a folder; the dashboard drag-and-drop flow accepts a folder or ZIP. Do not place licensed source archives inside the uploaded release directory.

This is the preferred path when the font license permits normal webfont deployment but does not permit publishing raw font binaries in a public source repository.

## Path B — Git integration

Use this only if the applicable font license explicitly permits the WOFF2 files to be stored in the connected repository.

Recommended Pages settings:

- Production branch: `main`
- Framework preset: None
- Build command: leave empty
- Build output directory: repository root (`/`)
- Root directory: repository root
- Environment variables: none required

Place the exact eleven manifest WOFF2 files under `assets/fonts/` and run:

```bash
python tools/verify-v16-assets.py
```

The browser smoke test will additionally verify all four local font families once the binaries are present in the checkout.

## Current V16 release flow

1. V16 source/static/avatar/browser QA completed on PR #1.
2. The exact selected font files were verified against `assets/fonts/README.md` and `V16_FONT_QA.md`.
3. A strict staged runtime containing the exact eleven WOFF2 files passed the complete asset/hash verifier.
4. PR #1 was merged into `main`.
5. Create/deploy the Cloudflare Pages project using Path A unless repository redistribution rights explicitly support Path B.
6. Repeat the short production smoke test against the generated `pages.dev` URL.

## What is continuously tested

The browser smoke job opens `index.html` directly from disk in headless Chrome. It exercises professor data boot, search, faculty/department/course filters, sorting, professor drawer, local saved-state persistence, comparison modal, dark/light theme, narrow mobile viewport, reduced-motion behavior and repository-local Professor Scout assets. The test does not start a web server.

## Offline parity

Cloudflare serves the same static layout that can be opened locally. V16 does not depend on a remote API/CDN at runtime. Data ships as local JavaScript chunks and avatar/font URLs are relative.

The optional `_headers` file affects HTTP hosting only; it does not change direct `file://` behavior.

## Final production check

After deployment, verify:

- initial render and story loader
- Ravi/Anjoman/Pinar/Kahroba rendering and Persian digits
- one professor search
- one professor drawer
- save state and one two-professor comparison
- dark/light theme
- desktop and mobile viewport
- no missing-font or missing-avatar requests in the browser network/console
- reduced-motion behavior
