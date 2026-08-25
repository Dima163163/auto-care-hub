# Phase L Design QA Checklist

Run this checklist before each release candidate.

- [x] AutoCare release smoke covers the public discovery shell, owner workspace and
  profile privacy at 1280px, 768px and 375px; the browser gate rejects horizontal
  overflow and missing landmarks. Production device evidence remains an external
  sign-off item.
- [x] Authenticated cabinet tabs intentionally omit the public footer; the workspace header/sidebar remain fixed while only the content pane scrolls.
- [x] Protected public-layout routes select the workspace shell from the URL before `/me` resolves, so the public footer never flashes during authentication.
- [x] Light/dark theme tokens and empty/loading/error states are covered by the
  AutoCare browser smoke and component contracts; production visual evidence is
  still required on the supported device matrix.
- [x] English/Russian locale loading and long-label-safe layout are covered by the
  locale matrix and lazy-chunk performance gate; add production translations to
  the release evidence register.
- [x] Shared dialogs, profile navigation and the responsive burger menu have
  keyboard interaction coverage; screen-reader traversal remains a manual gate.
- [x] Mobile menus close on outside click and expose a route back to public home.
- [ ] Create, cancel, and request a reschedule as a client; accept and reject a request as an owner.
- [ ] Confirm a booking card exposes calendar, cancellation, status history, and directions actions where applicable.
- [ ] Confirm owner cabinet editor saves image, amenities, cancellation policy, house rules, schedule exceptions, and blocked periods.
- [ ] Confirm admin audit-log filtering and CSV export work with empty and non-empty results.
