# Isfahan University Professor Review Site

Static Persian professor-review website for the University of Isfahan.

## Cloudflare Pages

No build step or backend is required.

- Framework preset: **None**
- Build command: leave empty
- Build output directory: `/`

The same files can also be opened locally without a server.

## Architecture

- Static HTML/CSS/JavaScript
- Professor data bundled locally and gzip-compressed
- No required API, database, CDN, or server runtime
- Story-based loading intro using the project avatar
- Reduced-motion preference respected

## Fonts

The supplied V15 archive references custom font files but does not include the actual `.woff2` files. This deployment therefore falls back to the local/system font stack rather than making an online font request.
