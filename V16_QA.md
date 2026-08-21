# V16 QA / release gate

This checklist is for the `v16` branch before PR #1 is merged into `main`.

## Static/offline architecture

- [x] HTML uses relative local paths.
- [x] Professor Scout runtime asset is local (`assets/avatar/loader-avatar.webp`).
- [x] Avatar motion is local JavaScript/CSS (`assets/avatar/avatar-motion.js`).
- [x] V15 professor data remains split into local JavaScript files; no remote API is required.
- [x] No CDN is required by V16.
- [x] No backend/database/server is introduced by V16.
- [x] Cloudflare Pages can serve the repository as static files with no build step.

## Avatar / interaction QA

- [x] Story loader has arrival → thinking → building → ready states.
- [x] Search focus/typing/completion updates Professor Scout state.
- [x] Card/detail interaction produces working guidance.
- [x] Save/compare/load-more reactions are wired.
- [x] Empty-result state is observed after results re-render.
- [x] Mascot avoids drawer/comparison overlays.
- [x] `prefers-reduced-motion` disables decorative character animation.
- [x] Current loader image is derived from the supplied Professor Scout reference sheet.

## Typography QA

- [x] `assets/css/fonts.css` contains only local relative font URLs.
- [x] UI/body role → Ravi Pro FaNum.
- [x] Display/headings role → Anjoman Pro.
- [x] Accent/numeric role → Pinar V3 Variable.
- [x] Student-voice/editorial role → Kahroba Pro Variable.
- [x] System-font fallback remains available if a binary is missing.
- [ ] All eleven WOFF2 binaries exist under `assets/fonts/`.
- [ ] Uploaded font sizes/hashes match `assets/fonts/README.md`.
- [ ] Visual check confirms Persian digits and heading/body weights render as intended.

## Browser smoke test after fonts are present

- [ ] Open `index.html` directly from disk and confirm the page reaches the professor list.
- [ ] Search by professor name.
- [ ] Filter by faculty, department and course.
- [ ] Sort by review count, rating and name.
- [ ] Open professor drawer and review dimensions/experiences.
- [ ] Save a professor and reload to verify local persistence.
- [ ] Compare two or three professors.
- [ ] Toggle dark/light theme.
- [ ] Confirm mobile layout at narrow viewport.
- [ ] Confirm reduced-motion behavior.
- [ ] Deploy the same commit to Cloudflare Pages and repeat a short smoke test.

## Merge policy

Keep PR #1 in draft while any required font binary or blocking smoke-test item remains incomplete. `main` stays on stable V15 until this checklist passes.
