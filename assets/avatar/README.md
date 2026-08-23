# Loading avatar — V17

The creator avatar is displayed **only inside the initial loading screen**. It
must never appear as a persistent mascot, search assistant, profile decoration,
comparison illustration, empty-state character or floating speech bubble.

The active, entirely local loading assets are:

- `loader-avatar.webp`: the available 128 × 128 px source image, displayed at
  its native size without pixelated upscaling.
- `avatar-motion.js`: a short, readiness-aware 24-stage animation that respects
  `prefers-reduced-motion` and removes the loading screen when the application
  is ready.

Other pose images in this historical source directory are not loaded by the
current application and are excluded from the staged V17 release. No external
image, GIF, video, CDN, API or background service is required.
