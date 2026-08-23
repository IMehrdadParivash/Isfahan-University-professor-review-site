# Cloudflare Pages deployment — V17

This is a static, offline-capable site. It requires no build system, Node.js runtime, API, database, Worker, Pages Function, paid Cloudflare service or runtime environment variables.

## Required privacy gate

Do not deploy an older commit or cached bundle: earlier public files contained individual-response numeric values and exact individual-response dates. Run both gates before every deployment:

```bash
python tools/validate-v17-data.py
python tools/verify-v16-assets.py --allow-missing-fonts
```

The validator checks the canonical 743-person roster, 17 faculties, 64 educational units, the 0–5 professor/course scale, suppression of all single-response scores and dates, and the hashes of the actual public runtime data.

## Option A: Git-integrated Pages

Recommended for the default **font-license-safe** release:

- Production branch: `main` after the reviewed privacy-fix pull request is merged.
- Framework preset: **None**.
- Build command: empty.
- Build output/root directory: repository root.
- Runtime environment variables: none.

Commercial webfont binaries are not part of the default repository release. The page bundles official Vazirmatn Regular/Bold under SIL OFL 1.1, includes the complete font license, retains local system-font fallbacks and never requires an external font CDN.

## Option B: Direct upload of a staged runtime

Create an allowlisted, verified runtime directory:

```bash
python tools/stage-v16-release.py
python tools/verify-v16-assets.py --root .release/v17 --allow-missing-fonts
```

Upload the **contents of `.release/v17/`** in Cloudflare Pages Direct Upload. The stage script refuses destinations outside the project-local `.release/` directory, rejects symbolic links and excludes development files, archived datasets and unlicensed font binaries.

Direct Upload and Git integration are different Cloudflare Pages project types; confirm the existing project's type before changing deployment processes. Do not create a new project or change a domain without the owner's approval.

### Optional licensed font deployment

Only after confirming that the applicable license permits serving those exact files from the intended public domain:

```bash
python tools/stage-v16-release.py --with-licensed-fonts
python tools/verify-v16-assets.py --root .release/v17 --require-licensed-fonts
```

Keep purchased archives on the private deployment machine. This switch does not grant permission to distribute the fonts through public Git history.

## Cache and incident response

`_headers` requires revalidation of mutable JavaScript and public data chunks so a newly deployed HTML page cannot be paired with a stale privacy-sensitive dataset. Security and cache headers apply to HTTP deployment only and do not alter `file://` behavior.

If a vulnerable release was already served, deploy the corrected bundle and purge affected Cloudflare cache entries or purge the project cache using an account with the relevant Cloudflare permissions. Changing provider configuration, removing public Git history or making the repository private requires an explicit owner decision. Removing a file in the next commit alone does not erase public historical blobs or third-party caches.

## Production acceptance checklist

- Confirm 743 professors, 17 faculties and 64 faculty/department units.
- Confirm faculty → department → course cascading, Persian search and complete filter reset.
- Confirm professor details and two-professor comparison are visually rendered and keyboard dismissible.
- Confirm single-response values and dates are absent from the downloaded public data, not merely hidden by the UI.
- Confirm desktop and mobile layouts, dark/light themes, short avatar-only loader and reduced-motion behavior.
- Confirm no external runtime requests, proprietary font files, raw student data or horizontal mobile overflow.
- Check the deployed response's CSP and cache headers.

A `pages.dev` or custom-domain address must come from the actual Cloudflare account or repository configuration; this guide intentionally does not invent a production URL. Reachability from inside Iran or without a VPN cannot be confirmed without an appropriate real network vantage point.
