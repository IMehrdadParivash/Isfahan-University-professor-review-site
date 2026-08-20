# V16 — Local typography + avatar motion

V16 keeps the V15 static/offline architecture and adds only local assets.

## Typography
- Ravi Pro FaNum: primary product/UI typeface
- Anjoman Pro: display/headings
- Pinar V3 Variable: signature/accent use
- Kahroba Pro Variable: student-voice/editorial content

Target paths:
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

## Avatar
- Move the loader avatar out of the HTML data URI into local assets.
- Add the pixel-art sprite/animation assets under `assets/avatar/`.
- Use code-driven animation (CSS/JavaScript) and local image assets only.
- Respect `prefers-reduced-motion`.

## Constraints
- Fully static
- Works from local files without a server
- Cloudflare Pages compatible
- No required CDN/API/backend
