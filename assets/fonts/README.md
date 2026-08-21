# V16 local font assets

The V16 stylesheet is already wired for the following local WOFF2 files. The repository owner should place the binaries in this directory using these exact names.

| File | Bytes | SHA-256 |
|---|---:|---|
| `RaviFaNum-Regular.woff2` | 43,204 | `4585ddee90901e505dad17a6d446a2c9459cd4530d2da859fd1811b7cc1d3b02` |
| `RaviFaNum-Medium.woff2` | 43,520 | `fa2df83e2838143b5387a6cfa95d0c9e189977179996069446d84559956dd01c` |
| `RaviFaNum-SemiBold.woff2` | 43,408 | `2a0b49ae99ee6d1afd42c681b5ac54e8d326a6df4c836b2330a9b0b0682e88cf` |
| `RaviFaNum-Bold.woff2` | 42,720 | `825cb536d958e3e5c6777c7002c27c3376842157300782c4e09765c6a6e60a32` |
| `RaviFaNum-ExtraBlack.woff2` | 41,964 | `8eb8de363eaeba6c6f6bdcbc22175a0cb616f09ca4320359469b0c82f424cbef` |
| `Anjoman-Regular.woff2` | 37,248 | `ccf81f0363b368dc3593a544702e219781d0bee2f40ba00161dbe4e2facc7329` |
| `Anjoman-Bold.woff2` | 37,184 | `6a53d5d721c706e85fd475dc3020dfde2f1cc5b5f6e8dc85a2793d4e3631a479` |
| `Anjoman-ExtraBold.woff2` | 37,172 | `82da9155187954225773b58b2d2799a337551abf18d8b195a8a5477380c6ce15` |
| `Anjoman-Heavy.woff2` | 38,928 | `d21efeb9dee50b6c504635b431e11e8b3ebe80fe6a5037289b4ede4e387e9031` |
| `Pinar-VF-FD.woff2` | 92,144 | `44ae0dc43d4d7b0750af2914ceffd8a47792654dc44d2810f5891ea142d54146` |
| `Kahroba-VF-FD.woff2` | 334,100 | `7cc15af7f4bc8df6d0f62c191126f3e8da2d886acd18ab179071e07ecf1b186c` |

These values were calculated from the user-supplied font archives selected for V16. They provide a byte-for-byte verification target after the repository owner uploads the font files.

## Typography roles

- Ravi Pro FaNum — product UI/body/filter/button text
- Anjoman Pro — headings/display
- Pinar V3 Variable — signature/accent text and selected large numerals
- Kahroba Pro Variable — student-voice/editorial passages

## Runtime behavior

`assets/css/fonts.css` uses only relative local URLs. There is no CDN or remote font request. If a font binary is absent, the CSS falls back to the local system stack, so the site remains functional while the release gate remains open.

## Release verification

After uploading the files, verify all eleven filenames and hashes above, then perform the final V16 smoke test before merging PR #1.
