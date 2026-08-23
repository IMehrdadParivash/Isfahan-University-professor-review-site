# Isfahan University Professor Review Site — V17

Offline-first, Persian, right-to-left professor/course discovery for the **University of Isfahan**. The application is plain static HTML, CSS and JavaScript: it requires no backend, database, API, external CDN, paid service, build system, Cloudflare Worker or Pages Function.

## Canonical public dataset

- Exactly **743** officially identified professors, **17** faculties, **64** faculty/department units and **61** distinct department labels.
- Evidence and numeric comparisons exist only for a **professor × course** pair; there is no overall professor rating or legacy Bayesian ranking.
- The only supported score range is **0–5**.
- A course or dimension score with fewer than two underlying responses is removed from the public data before publication. Single-response exact dates are also removed.
- Raw student messages, identifying fields and individual responses must never enter the browser bundle.
- Public dataset, compressed payload and runtime chunks are cryptographically checked against `assets/data/dataset-manifest.json`.
- The avatar appears only during the short, reduced-motion-aware loading sequence.

The older V16 planning/QA documents describe a historical implementation and are not a description of the current V17 runtime. The active entrypoint is `index.html`, the active application is `assets/js/app-v17.js`, and the active public data chunks are the `data-v17-*` files referenced by `index.html`.

## Run locally

Open `index.html` directly as a `file://` URL in a recent Chromium-based browser. No development server is required. Alternatively, any static file server or Cloudflare Pages can serve the repository root.

## Verify before publication

```bash
python tools/validate-v17-data.py
python tools/verify-v16-assets.py --allow-missing-fonts
python tools/stage-v16-release.py
python tools/verify-v16-assets.py --root .release/v17 --allow-missing-fonts
```

The tooling filenames retain their original V16 names for backward compatibility, but they inspect the files actually referenced by the V17 entrypoint. Browser checks on runners with Chrome and Selenium are:

```bash
python tools/browser-smoke-v16.py
python tools/browser-ui-regression.py
```

GitHub Actions executes the data, source, staging-safety and real-browser checks for pull requests and pushes to `main`.

## Font licensing

The default public release bundles the official **Vazirmatn Regular and Bold** WOFF2 files under the **SIL Open Font License 1.1**, includes the complete license at `assets/fonts/OFL.txt`, keeps operating-system Persian-capable fallbacks, and publishes **no proprietary font binaries**. Commercial font archives, extracted proprietary families and `.release/` are gitignored.

If you independently confirm that a purchased font license permits public web serving, you can prepare a separate local release with:

```bash
python tools/stage-v16-release.py --with-licensed-fonts
```

This opt-in requires the licensed archives expected by `tools/install-v16-fonts.py`. It does not make publishing those files in a public Git repository lawful. Removing files in a new commit does **not** remove historical public Git blobs or previously deployed/cached copies; history rewriting, repository-visibility changes and provider cache purges require explicit repository-owner decisions and access.

See [CLOUDFLARE_PAGES.md](CLOUDFLARE_PAGES.md) for both Git-integrated and direct-upload publication.
