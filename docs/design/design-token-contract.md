# AutoCare Hub Design Token Contract

> The historical token audit below remains useful for migration checks. New
> AutoCare screens follow `autocare-design-brief.md`; raw colors are still
> prohibited and semantic tokens remain mandatory.

The shared foundation lives in `src/index.css`. Components and page layouts
should consume these tokens instead of introducing one-off typography, layout,
radius, focus, or motion values.

## Foundations

- Typography: `--font-display`, `--font-body`, `--type-*`, and
  `--measure-readable` define the readable hierarchy and copy measure. The
  approved Option A pairing is Commissioner for display text and IBM Plex Sans
  for body/form text; see `font-license-contract.md` for the source and
  license record. Both families include Latin and Cyrillic coverage, so a
  heading does not change its typeface between English and Russian.
- Layout: `--layout-public-max`, `--layout-operational-max`, and
  `--layout-gutter` define the two product density modes and responsive page
  gutters.
- Mobile fixed controls: `--mobile-nav-height` is the single reserved height
  used by page shells, document scroll padding, and PWA update notices.
- Spacing: `--space-control`, `--space-section`, and `--space-page` are the
  default control, section, and page rhythm values.
- Shape: `--radius-control`, `--radius-card`, `--radius-panel`, and
  `--radius-pill` keep controls, repeated items, and panels restrained.
- Interaction: `--focus-ring-*` defines the keyboard focus geometry.
- Motion: `--motion-duration-*` and `--motion-ease-standard` provide named
  timing values. The global reduced-motion rule remains authoritative.

Semantic colors remain separate from these foundations. Product-specific
rating presentation uses the `--rating-fill` and `--rating-foreground` roles
in both themes. Shared UI and inspectable product surfaces use semantic color
roles from the theme; raw color values are limited to the token definitions
themselves and are rejected in TypeScript/TSX source by the contract check.

Run `npm run check:design-tokens` after changing the foundation or semantic
theme. The check verifies required light/dark semantic roles, foundation
declarations, focus and safe-area utilities, this contract document, and the
source-level guard against new raw colors, `rounded-3xl`, or 9-11px labels.
The guard keeps only the fixed bottom navigation and dense audit JSON metadata
as explicit exceptions for compact geometry and technical metadata.
