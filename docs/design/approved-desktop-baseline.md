# Legacy desktop baseline — retained for migration reference

Approved by the user on 2026-08-02. This is the source of truth for later
desktop implementation and review. It records design confirmation 2 of 3 for
the former AutoCare Hub desktop route package. It is retained only to explain the
legacy cabinet UI while AutoCare Hub is migrated. The current approved visual
direction and implementation authority are defined in `autocare-design-brief.md`
and the product decisions in `docs/product/OPEN_DECISIONS.md`.

Reference suite: `docs/design/proposals/2026-08-02-v3-desktop/README.md`.
Selected homepage direction: `docs/design/approved-homepage-direction.md`.

## Invariants

- Every public and authenticated desktop page shares the global header:
  AutoCare Hub, Cabinets, For owners, Pricing, Help, workspace/account, language,
  light/dark theme, notifications, and profile.
- The global header is a light surface: white/background header with a thin
  neutral border, blue AutoCare Hub mark, dark text, and blue active state. A
  black or dark full-width header is not part of the approved AutoCare Hub visual
  system; dark navy is reserved for text, icons, and small controls.
- Owner, client, and admin pages add a persistent grouped sidebar below the
  header for role navigation. The sidebar has the active role destination and
  a collapse control; the header must not absorb role links as the product grows.
- Public pages show a useful multi-column footer. Authenticated pages show a
  compact operational footer in the content area.
- Public catalog list and map selection stay synchronized. Cabinet details keep
  reviews on the same route, not in a modal. Confirmed bookings offer directions
  only after explicit location permission and provide a manual origin fallback.
- The selected homepage is availability-first. It explains AutoCare Hub in plain
  language, leads with search and availability, and then offers instruction,
  safety, FAQ, and support routes. It does not contain a map.
- The visible sun/moon control persists in the header and footer where present.
- Production fake-browser removal was explicitly approved and completed during
  the desktop homepage implementation on 2026-08-04; remaining responsive and
  release QA still follows the staged desktop, tablet, and PWA/mobile order.

## Reference screens

- Catalog and map: `catalog-map-desktop.png`
- Cabinet detail and booking: `cabinet-detail-booking-desktop.png`
- Cabinet reviews: `cabinet-reviews-desktop.png`
- Client booking and directions: `client-booking-route-desktop.png`
- Owner dashboard: `owner-dashboard-desktop.png`
- Owner cabinet editor: `owner-cabinet-editor-desktop.png`
- Admin audit: `admin-audit-desktop.png`

All files are in `docs/design/proposals/2026-08-02-v3-desktop/`.
