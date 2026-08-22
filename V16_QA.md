# V16 QA / release gate

This checklist is for the `v16` branch before PR #1 is merged into `main`.

## Static/offline architecture

- [x] HTML uses relative local paths.
- [x] Professor Scout runtime assets are local under `assets/avatar/`.
- [x] Avatar motion is local JavaScript/CSS (`assets/avatar/avatar-motion.js`).
- [x] V15 professor data remains split into local JavaScript files; no remote API is required.
- [x] No CDN is required by V16.
- [x] No backend/database/server is introduced by V16.
- [x] Cloudflare Pages can serve the repository as static files with no build step.
- [x] Automated GitHub Actions release gate is present at `.github/workflows/v16-release-gate.yml`.

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
- [x] System-font fallback remains available if a binary is missing.
- [x] Source WOFF2 binaries supplied for V16 were byte-size/SHA-256 checked against the verification manifest.
- [x] OpenType metadata was parsed for the selected binaries; the expected internal families, Persian digits and Persian/Arabic glyph coverage are present.
- [x] Ravi weights verified as 400/500/600/700/950; CSS ExtraBlack declaration corrected to 950.
- [x] Anjoman weights verified as 400/700/800/900.
- [x] Pinar variable axes verified: `wght` 300–900 plus `DSTY` and `KSHD`.
- [x] Kahroba variable axes verified: `wght` 100–900 plus `CNTR` and `wdth`.
- [x] NoEn/Condensed/Italic variants supplied separately are intentionally not substituted for the release-manifest files.
- [x] `V16_FONT_QA.md` records the exact selection and metadata validation without redistributing font binaries.
- [x] `tools/install-v16-fonts.py` can install/verify the exact eleven files from the authorized local ZIP archives in one command.
- [ ] All eleven WOFF2 binaries exist under `assets/fonts/` in the repository **only if the applicable font license permits repository distribution**.
- [ ] Uploaded font sizes/hashes pass `python tools/verify-v16-assets.py` in the repository checkout.
- [ ] Final browser visual check confirms Persian digits and heading/body weights render as intended with repository-served fonts.

## Automated browser smoke test

GitHub Actions opens the site through a real `file://` URL in headless Chrome. This intentionally tests the no-server/offline execution path; Selenium is CI-only and is not a runtime dependency of the site.

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
- [ ] After the repository-licensed WOFF2 binaries are committed, rerun the same browser smoke test with local fonts loaded and visually inspect typography.
- [ ] Deploy the same release commit to Cloudflare Pages and repeat a short production smoke test.

## Merge policy

Keep PR #1 in draft while any required font binary or blocking smoke-test item remains incomplete. `main` stays on stable V15 until this checklist passes.
