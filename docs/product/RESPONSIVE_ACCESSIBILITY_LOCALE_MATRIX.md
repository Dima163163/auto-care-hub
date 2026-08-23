# Responsive, accessibility and localization matrix

This matrix is the release evidence template for the public web and workspaces.

## Viewports

| Profile | Widths | Required checks |
| --- | --- | --- |
| compact mobile | 360, 390 | burger navigation, fixed header, one-column cards, map below filters, 44px targets |
| tablet | 768, 820, 1024 | no header overlap, two-column results, fixed workspace sidebar, footer behavior |
| desktop | 1280, 1440 | approved homepage composition, comparison row, map/list alignment |

## Accessibility checks

- keyboard-only traversal with visible focus and Escape for dialogs/menus;
- screen-reader names for custom selects, map controls, status badges and upload
  actions;
- no color-only status meaning, reduced-motion support and readable contrast;
- loading, empty, stale, offline, denied and error states preserve context;
- long service names, provider names, translated dates and RTL text do not
  overflow controls.

## Locale fixtures

Run the matrix for `ru`, `en`, `es`, `ro`, one long European locale and one RTL
locale. Verify independent interface locale versus service market, currency
formatting, date/timezone labels, plural counts, legal links and SEO canonical
links. Record screenshots and defects per route before the stable-web gate.
