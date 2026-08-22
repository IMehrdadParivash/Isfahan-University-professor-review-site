# V16 QA / release gate

This checklist is for the `v16` branch before PR #1 is merged into `main`.

## Static/offline architecture

- [x] HTML uses relative local paths.
- [x] Professor Scout runtime assets are local under `assets/avatar/`.
- [x] Avatar motion is local JavaScript/CSS (`assets/avatar/avatar-motion.js`).
- [x] V15 professor data remains split into local JavaScript files; no remote API is required.
- [x] No CDN is required by V16.
- [x] No backend/database/server is introduced by V16.
- [x] Cloudflare Pages can serve the staged release as static files with no runtime build.
- [x] Automated GitHub Actions release gate is present at `.github/workflows/v16-release-gate.yml`.
- [x] Source CI publishes a `v16-source-runtime` artifact so the exact PR runtime can be staged and verified outside Git history.

## Avatar / interaction QA

- [x] Dedicated local poses exist for idle, think, work, walk, search, success, compare and empty states.
- [x] Story loader switches poses across arrival → thinking → building → ready states.
- [x] Search focus/typing/completion updates both Professor Scout state and pose.
- [x] Card/detail interaction produces the working pose/guidance.
- [x] Save/load-more reactions are wired.
- [x] Compare uses its dedicated comparison pose.
- [x] Empty-result state uses its dedicated no-results pose.
- [x] Mascot avoids drawer/comparison overlays.
- [x] Persistent mascot rests as a compact avatar-only control instead of a content-blocking chat strip.
- [x] Guidance bubble appears only on explicit mascot interaction or meaningful UI state changes and collapses on scroll/Escape.
- [x] Mascot moves above the compare bar instead of overlapping it.
- [x] Mobile browser CI verifies the collapsed persistent footprint stays avatar-sized (≤ 80×80 CSS px).
- [x] `prefers-reduced-motion` disables decorative character animation.
- [x] Pose files are derived from the supplied Professor Scout reference sheet.
- [x] `tools/verify-v16-assets.py` requires all avatar state files before release.
- [x] Automated desktop/mobile/reduced-motion screenshots were reviewed after the compact-mascot change and no persistent guidance strip masks the page at rest.

## Typography QA

- [x] `assets/css/fonts.css` contains only local relative font URLs.
- [x] UI/body role → Ravi Pro FaNum.
- [x] Display/headings role → Anjoman Pro.
- [x] Accent/numeric role → Pinar V3 Variable.
- [x] Student-voice/editorial role → Kahroba Pro Variable.
- [x] System-font fallback remains available if a binary is absent from the source checkout.
- [x] Source WOFF2 binaries supplied for V16 were byte-size/SHA-256 checked against the verification manifest.
- [x] OpenType metadata was parsed for the selected binaries; expected internal families, Persian digits and Persian/Arabic glyph coverage are present.
- [x] Ravi weights verified as 400/500/600/700/950; CSS ExtraBlack declaration corrected to 950.
- [x] Anjoman weights verified as 400/700/800/900.
- [x] Pinar variable axes verified: `wght` 300–900 plus `DSTY` and `KSHD`.
- [x] Kahroba variable axes verified: `wght` 100–900 plus `CNTR` and `wdth`.
- [x] NoEn/Condensed/Italic variants supplied separately are intentionally not substituted for the release-manifest files.
- [x] `V16_FONT_QA.md` records the exact selection and metadata validation without redistributing font binaries.
- [x] `tools/install-v16-fonts.py` supports deployment-only installation with `--dest-root`.
- [x] `tools/verify-v16-assets.py` supports strict staged verification with `--root` and license-safe source verification with `--allow-missing-fonts`.
- [x] The exact current `v16-source-runtime` artifact was combined locally with the eleven selected WOFF2 files and passed **strict** `tools/verify-v16-assets.py` verification: every runtime file, font byte size and SHA-256 matched.
- [x] Staged font payload verified at 791,592 bytes across the eleven exact WOFF2 files.
- [ ] Final production-browser visual check confirms Persian digits and heading/body weights after Cloudflare deployment.

## Automated browser smoke test

GitHub Actions opens the source site through a real `file://` URL in headless Chrome. This intentionally tests the no-server/offline execution path; Selenium is CI-only and is not a runtime dependency of the site.

- [x] Open `index.html` directly from disk and confirm the page reaches the professor list.
- [x] Search by professor name.
- [x] Filter by faculty, department and course.
- [x] Sort by review count, rating and name.
- [x] Open professor drawer and confirm detail content renders.
- [x] Save a professor and reload to verify local persistence.
- [x] Compare two professors and open the comparison modal.
- [x] Toggle dark/light theme.
- [x] Confirm narrow mobile viewport renders without horizontal page overflow.
- [x] Confirm the idle mascot footprint remains compact on mobile.
- [x] Confirm reduced-motion behavior disables decorative mascot animation.
- [x] Confirm Professor Scout uses repository-local pose assets at runtime.
- [x] Source asset verification is green in license-safe mode; missing proprietary fonts are reported as intentionally absent rather than silently accepted.
- [x] Release tooling syntax/help checks pass in CI.
- [ ] Deploy the strict staged release to Cloudflare Pages and repeat the short production smoke test with the real fonts served.

## Selected release strategy

Use the staged Direct Upload path documented in `CLOUDFLARE_PAGES.md` unless the applicable font license explicitly permits repository redistribution. This keeps proprietary font binaries out of public Git history while preserving exact local/offline font assets in the deployment artifact.

## Merge policy

PR #1 may move out of draft when all source/runtime browser gates are green and the exact staged runtime has passed strict asset/font verification. The remaining production-browser typography check is performed on the deployed staged artifact. `main` must never contain unverified or accidentally substituted font binaries.
