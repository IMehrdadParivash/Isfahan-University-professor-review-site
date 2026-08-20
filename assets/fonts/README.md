# V16 local font assets

The V16 stylesheet is already wired for the following local files. Add the binary `.woff2` files here using these exact names:

- RaviFaNum-Regular.woff2
- RaviFaNum-Medium.woff2
- RaviFaNum-SemiBold.woff2
- RaviFaNum-Bold.woff2
- RaviFaNum-ExtraBlack.woff2
- Anjoman-Regular.woff2
- Anjoman-Bold.woff2
- Anjoman-ExtraBold.woff2
- Anjoman-Heavy.woff2
- Pinar-VF-FD.woff2
- Kahroba-VF-FD.woff2

Typography roles:
- Ravi Pro FaNum — product UI/body/filter/button text
- Anjoman Pro — headings/display
- Pinar V3 Variable — signature/accent text and selected large numerals
- Kahroba Pro Variable — student-voice/editorial passages

No network font request is required. If a binary is missing, the CSS falls back to the local system font stack.
