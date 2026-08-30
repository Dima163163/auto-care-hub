# AutoCare Hub font license contract

This is the approved Option A typography pairing for the product UI:

- **Display / brand accents:** `@fontsource-variable/commissioner@5.3.0`
- **Body / forms / data:** `@fontsource-variable/ibm-plex-sans@5.3.0`

Both packages are bundled locally and declare the SIL Open Font License 1.1
(`OFL-1.1`). Local bundling keeps the UI independent from a remote font CDN.
The package license files remain in the installed distribution and must be
preserved when dependencies are upgraded.

Commissioner preserves the geometric, technical display character from
Option A while shipping both Cyrillic and Latin glyphs. IBM Plex Sans remains
the body/form face, also with both scripts, so English and Russian do not
silently switch to a visibly different fallback face.

## Change rules

- Keep these two families as the only product font dependencies until a new
  typography option is explicitly approved.
- Do not add remote `@import` URLs, proprietary webfont files, or an untracked
  font fallback to application CSS.
- When upgrading a package, re-check its declared license and update the
  versions above in the same change.
- Keep typography imports in `src/index.css`; component CSS should consume the
  shared `--font-display`, `--font-body`, or `--font-heading` tokens.

Reference: [SIL Open Font License FAQ](https://software.sil.org/fonts/faq/)
and the [Google Fonts developer documentation](https://developers.google.com/fonts).
