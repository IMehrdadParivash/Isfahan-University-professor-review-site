# Loading avatar

The creator avatar is displayed **only inside the initial loading screen**. It
must never appear as a persistent mascot, search assistant, profile decoration,
comparison illustration, empty-state character or floating speech bubble.

The active, entirely local loading assets are:

- `loader-avatar.webp`: the available 128 × 128 px source image, displayed at
  its native size without pixelated upscaling.
- `assets/js/loader.js`: a short, readiness-aware 24-stage animation that respects
  `prefers-reduced-motion` and removes the loading screen when the application
  is ready.

The four remaining pose images are used exclusively by the initial loading
animation. No external image, GIF, video, CDN, API or background service is
required.
