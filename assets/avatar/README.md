# Professor Scout avatar assets — V16

Current V16 state:
- `loader-avatar.webp` is the local fallback image extracted from the V15 loader.
- The next step is replacing the static fallback with the user's pixel-art sprite/animation assets.

Planned states from the existing character system:
- idle
- thinking
- working / laptop
- walking / arrival
- success / saved
- searching
- results ready
- compare / analysis

Recommended file structure:

```text
assets/avatar/
  loader-avatar.webp
  sprite-loader.png
  sprite-ui.png
  avatar-motion.js
```

Animation remains code-driven with CSS/JavaScript. Image files are local; no GIF/video/CDN/backend is required. `prefers-reduced-motion` must keep a static fallback.
