# Phase L Design QA Checklist

Run this checklist before each release candidate.

- [ ] Public catalog, cabinet page, booking flow, profile bookings, owner workspace, and admin workspace render without horizontal overflow at 1440px, 1024px, 768px, and 375px.
- [ ] Verify light and dark themes for the same screens, including empty, loading, and error states.
- [ ] Verify English and Russian copy with long names, long addresses, and long service titles.
- [ ] Confirm all dialogs can be opened, closed, and confirmed with keyboard focus visible.
- [ ] Confirm mobile menus close on outside click and leave a route back to the public home page.
- [ ] Create, cancel, and request a reschedule as a client; accept and reject a request as an owner.
- [ ] Confirm a booking card exposes calendar, cancellation, status history, and directions actions where applicable.
- [ ] Confirm owner cabinet editor saves image, amenities, cancellation policy, house rules, schedule exceptions, and blocked periods.
- [ ] Confirm admin audit-log filtering and CSV export work with empty and non-empty results.
