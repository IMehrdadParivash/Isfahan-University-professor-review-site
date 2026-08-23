# Public, local Persian typography

The public release bundles only the official Vazirmatn Persian/Arabic fonts
from <https://github.com/rastikerdar/vazirmatn>. They are redistributed under
the SIL Open Font License 1.1; the complete upstream license is provided in
[`OFL.txt`](OFL.txt).

| File | Bytes | SHA-256 |
|---|---:|---|
| `Vazirmatn-Regular.woff2` | 50,684 | `e382101336c6eb32cfb31381c027d02d2e0354bad08f6a395d4088beb3db3d91` |
| `Vazirmatn-Bold.woff2` | 51,020 | `836fae7d42d83faa249bc00e0099592be98a1fa260d22d82f269b6091e585627` |

`assets/css/fonts.css` loads both files from relative local paths and includes
Persian-capable system fallbacks. The site does not need a font CDN, internet
connection or paid service at runtime.

Commercial Ravi, Anjoman, Pinar and Kahroba binaries must not be committed to
the public repository. Their names and private archives are ignored by Git.
