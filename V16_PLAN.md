# V16 — Local typography + Professor Scout motion

V16 preserves the V15 static/offline architecture and adds a local typography system plus the Professor Scout character layer.

## Current status

- [x] `v16` isolated from stable `main`
- [x] V15 data/search/filter/compare architecture preserved
- [x] story loader uses a repository-local avatar asset
- [x] Professor Scout motion is code-driven with CSS/JavaScript
- [x] search, card, saved, compare, load-more and empty-result reactions are wired
- [x] mascot hides around large overlays to avoid UI collisions
- [x] `prefers-reduced-motion` is respected
- [x] typography roles and local font paths are wired
- [x] no required CDN/API/backend introduced
- [x] direct relative paths retained for offline/file use and Cloudflare Pages
- [ ] font binary files must be placed by the repository owner at the exact paths below
- [ ] final visual smoke test after the font binaries are present
- [ ] merge PR #1 into `main`

## Typography roles

- Ravi Pro FaNum — primary product/UI typeface
- Anjoman Pro — display/headings
- Pinar V3 Variable — signature/accent/numeric emphasis
- Kahroba Pro Variable — student-voice/editorial content

### Required local font paths

- `assets/fonts/RaviFaNum-Regular.woff2`
- `assets/fonts/RaviFaNum-Medium.woff2`
- `assets/fonts/RaviFaNum-SemiBold.woff2`
- `assets/fonts/RaviFaNum-Bold.woff2`
- `assets/fonts/RaviFaNum-ExtraBlack.woff2`
- `assets/fonts/Anjoman-Regular.woff2`
- `assets/fonts/Anjoman-Bold.woff2`
- `assets/fonts/Anjoman-ExtraBold.woff2`
- `assets/fonts/Anjoman-Heavy.woff2`
- `assets/fonts/Pinar-VF-FD.woff2`
- `assets/fonts/Kahroba-VF-FD.woff2`

The user has confirmed they hold/authorize the required rights for the supplied project assets. The chat environment does not redistribute font binaries, so the font files themselves are the one owner-side upload step.

## Professor Scout behavior

The local asset `assets/avatar/loader-avatar.webp` is used for the V16 character layer. Motion is produced in code rather than GIF/video, so the site remains portable and offline-safe.

States currently implemented:

- arrival
- thinking
- building/working
- ready/success
- search guidance
- professor-detail guidance
- compare/save reaction
- no-results reaction
- overlay collision avoidance

## V16 constraints

- Fully static
- No server required
- No build step required
- Cloudflare Pages compatible
- Direct local-file architecture retained
- No required CDN/API/backend
- Reduced-motion fallback

## Release gate

PR #1 remains draft until the local WOFF2 files are present and the final smoke test passes. `main` remains the stable V15 release until then.
