# Legacy homepage direction — retained for migration reference

Date: 2026-08-02

The former project selected the availability-first homepage direction (A). This
file is retained as migration context only. AutoCare Hub implementation follows
`autocare-design-brief.md` and is authorized by the current product decisions.

Reference images:

- `docs/design/proposals/2026-08-02-home-variants/availability-first-information-desktop.png`
- `docs/design/proposals/2026-08-02-home-variants/availability-first-guides-desktop.png`

## Route purpose

A first-time visitor must be able to understand what AutoCare Hub is, why it is
useful, and what to do next without signing in. AutoCare Hub helps drivers find,
compare, and book automotive services; it also gives providers a clear path to
list locations, offers, and availability.

## Required route order

1. A concise purpose statement with inspectable real provider imagery.
2. City, service, date, duration, and availability search as the primary task.
3. Result continuity with availability and a route into provider details.
4. A practical "Start with AutoCare Hub" section with how-booking-works, choice,
   owner listing, safety/verification, cancellation/FAQ, client journey,
   owner journey, Help center, and support.
5. The shared multi-column footer.

## Boundaries and acceptance criteria

- No map belongs on the homepage. Map discovery is restricted to the catalog;
  geographic context belongs on a cabinet route; directions appear only for a
  confirmed booking and only after location consent with a manual-origin
  fallback.
- The public header contains AutoCare Hub, Services, For providers, Pricing, Help,
  language, theme, and authentication entry points. Tablet may place secondary
  public links under More without hiding them.
- The footer provides pathways to help, safety, privacy, legal, language, and
  theme controls.
- Information links must lead to real guide, policy, FAQ, or support routes;
  they are not decorative cards.
- The selected route must remain readable in light and dark themes, at desktop
  and tablet widths, with keyboard and screen-reader access to every action.

Final visual implementation remains blocked until confirmation 3 of 3.
