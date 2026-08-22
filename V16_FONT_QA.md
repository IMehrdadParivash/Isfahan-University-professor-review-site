# V16 typography QA

This note records validation of the exact user-supplied webfont files selected for V16. It does **not** include or redistribute proprietary font binaries.

## Exact file integrity

The selected local WOFF2 files match the release manifest already documented in `assets/fonts/README.md` and checked by `tools/verify-v16-assets.py`:

- Ravi FaNum: Regular, Medium, SemiBold, Bold, ExtraBlack
- Anjoman: Regular, Bold, ExtraBold, Heavy
- Pinar VF FD
- Kahroba VF FD

## Parsed OpenType metadata

The selected files were opened with a font parser and their internal metadata was checked.

| V16 role | Internal family | Weight / axes | Persian digits | Persian/Arabic glyph coverage |
|---|---|---|---|---|
| UI / body | Ravi FaNum | 400, 500, 600, 700, 950 | yes | yes |
| Display / headings | Anjoman | 400, 700, 800, 900 | yes | yes |
| Accent / numeric | Pinar-VF-FD | `wght` 300–900, `DSTY`, `KSHD` | yes | yes |
| Student voice / editorial | Kahroba-VF-FD | `wght` 100–900, `CNTR`, `wdth` | yes | yes |

`assets/css/fonts.css` therefore declares Ravi ExtraBlack at weight **950**, matching the font's own OS/2 metadata.

## Variant selection

Additional user-supplied `Ravi NoEn` and `Anjoman-NoEn`/Condensed/Italic files were inspected but are intentionally not substituted for the selected V16 files. V16 keeps the exact FaNum and non-condensed/non-italic files defined by the release manifest.

## Distribution note

Some supplied packages identify the fonts as proprietary/commercial software. The repository therefore keeps the binary-font distribution step separate from source-code QA. The CSS uses local relative URLs and system fallbacks, and the release verifier remains the source of truth for the exact expected binaries.

## Remaining typography release checks

1. Place the licensed WOFF2 binaries under `assets/fonts/` using the exact manifest names only where the applicable license permits that distribution method.
2. Run `python tools/verify-v16-assets.py`.
3. Run the existing direct-`file://` browser smoke test so Chrome verifies all four local font families.
4. Perform the final desktop/mobile visual typography review before merging PR #1.
