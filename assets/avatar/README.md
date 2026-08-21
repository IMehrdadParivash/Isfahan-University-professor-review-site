# Professor Scout avatar system — V16

The V16 character is based on the user-supplied Professor Scout pixel-art reference sheet: olive hoodie, dark cargo pants, glasses, dark hair, white sneakers, with task-specific reactions.

## Repository implementation

V16 now uses dedicated local WebP poses rather than reusing one static image for every state:

- `pose-idle.webp` — default helper state
- `pose-think.webp` — search focus / thinking
- `pose-work.webp` — professor details and loading more results
- `pose-walk.webp` — story-loader arrival
- `pose-search.webp` — active search
- `pose-success.webp` — ready / saved / successful completion
- `pose-compare.webp` — compare flow
- `pose-empty.webp` — no-results guidance
- `loader-avatar.webp` — 128×128 local fallback retained for resilience
- `avatar-motion.js` — state machine, image switching and CSS motion layer

All pose files are derived from the supplied Professor Scout sheet and are stored locally in this repository. No GIF, video, CDN, API, backend or server is required.

## Story-loader sequence

1. `walk` — creator/assistant arrives
2. `think` — understands the task
3. `work` — builds search/filter/compare experience
4. `success` — site ready

With `prefers-reduced-motion: reduce`, decorative motion is disabled and the loader resolves quickly to the ready state.

## UI triggers wired in V16

- Search field focus → `think`
- Search typing → `search`
- Search completion → `success`
- Professor card/detail interaction → `work`
- Saved-only toggle → `success`
- Compare action → `compare`
- Load more → `work`
- Empty results → `empty`
- Drawer / comparison overlays → mascot hides to avoid collision
- Escape → quick mascot visibility toggle when no overlay is open

## Architecture

```text
assets/avatar/
  loader-avatar.webp
  pose-idle.webp
  pose-think.webp
  pose-work.webp
  pose-walk.webp
  pose-search.webp
  pose-success.webp
  pose-compare.webp
  pose-empty.webp
  avatar-motion.js
  README.md
```

The state API is intentionally simple, so additional poses from the original sheet can be introduced later without changing the static/offline architecture.
