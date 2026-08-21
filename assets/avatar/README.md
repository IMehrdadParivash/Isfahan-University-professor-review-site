# Professor Scout avatar system — V16

The V16 character is based on the user-supplied Professor Scout pixel-art reference sheet: olive hoodie, dark cargo pants, glasses, dark hair, white sneakers, with idle/thinking/working/searching/saved/compare reactions.

## Repository implementation

- `loader-avatar.webp` — repository-local 128×128 WebP derived from the supplied Professor Scout sprite sheet, using the seated laptop/work pose. It is used by the story loader and the helper mascot.
- `avatar-motion.js` — state machine and CSS motion layer. It does not require GIF, video, CDN, API or a server.

The supplied reference sheet provides the visual language for these states:

- idle
- thinking
- laptop / working
- walking / arrival
- search
- success / saved
- results ready
- compare / analysis
- no-results / confused
- richer-comments / reading
- dark-mode reaction

V16 currently implements those behavioral states in code using the local Professor Scout asset. This keeps the repository lightweight and preserves direct `file://` compatibility. Dedicated per-pose local sprites can be substituted later without changing the state API.

## UI triggers wired in V16

- Search field focus → thinking
- Search typing → searching
- Search completion → success
- Professor card interaction → working/detail guidance
- Saved-only toggle → success
- Compare action → success
- Load more → working
- Empty results → no-results guidance
- Drawer / comparison overlays → mascot hides to avoid collision
- Escape → quick mascot visibility toggle when no drawer is open

## Accessibility

`prefers-reduced-motion: reduce` disables decorative motion while keeping the character and interface usable.

## Architecture

```text
assets/avatar/
  loader-avatar.webp
  avatar-motion.js
  README.md
```

All runtime character behavior is local and static; no external dependency is required.
