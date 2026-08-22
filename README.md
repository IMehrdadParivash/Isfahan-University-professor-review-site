# Isfahan University Professor Review Site — V16

Static Persian professor-review website for the University of Isfahan.

## Current release

`main` contains **V16**: local typography architecture plus the Professor Scout avatar/motion system.

V16 remains fully static and can run directly from local files without a backend, database, API, CDN, Node.js runtime, Pages Functions or Workers.

## V16 highlights

- Story-based Professor Scout loading sequence
- Dedicated local avatar poses for idle, think, work, walk, search, success, compare and no-results states
- Compact persistent Professor Scout helper with search/detail/save/compare reactions
- `prefers-reduced-motion` support
- Local professor data and filters/search/compare UI
- Dark/light theme and mobile layout
- Local typography roles:
  - Ravi FaNum — UI/body
  - Anjoman — headings/display
  - Pinar VF FD — accents/numerics
  - Kahroba VF FD — student-voice/editorial text

## Offline architecture

- Plain HTML/CSS/JavaScript
- Relative local asset paths
- Professor data bundled locally
- No required network request at runtime
- Direct `file://` browser smoke-tested in CI

## Fonts and deployment

The selected font packages include proprietary/commercial materials. V16 therefore keeps the exact font manifest and verification tooling in the repository without automatically publishing raw proprietary font binaries in public Git history.

Two release paths are supported:

1. **Staged Direct Upload — recommended when repository redistribution is not licensed**
   - keep licensed font archives only on the deployment machine
   - run `python tools/stage-v16-release.py`
   - the script creates `.release/v16/`, installs only the eleven exact WOFF2 files, and verifies every file/hash
   - upload the **contents of `.release/v16/`** to Cloudflare Pages

2. **Git integration**
   - use only when the applicable font license explicitly permits storing the WOFF2 files in the connected repository
   - framework preset: **None**
   - build command: empty
   - output/root: repository root

See [`CLOUDFLARE_PAGES.md`](CLOUDFLARE_PAGES.md), [`V16_QA.md`](V16_QA.md) and [`V16_FONT_QA.md`](V16_FONT_QA.md) for the exact release procedure.

## Verification

Source-safe verification:

```bash
python tools/verify-v16-assets.py --allow-missing-fonts
```

Strict staged-release verification:

```bash
python tools/stage-v16-release.py
python tools/verify-v16-assets.py --root .release/v16
```

The release gate also exercises the site through a real `file://` URL in headless Chrome, including search, filters, sorting, professor details, saved state, comparison, theme switching, mobile overflow and reduced-motion behavior.
