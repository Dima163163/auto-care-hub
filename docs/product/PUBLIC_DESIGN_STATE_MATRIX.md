# Public design state matrix

Updated: 2026-08-23

This is the implementation checklist for the next public/design slices. The
approved desktop homepage remains visually locked; these states are functional
and accessibility work, not a redesign.

| Surface | Loading | Empty | Error/retry | Offline/stale | Next gap |
| --- | --- | --- | --- | --- | --- |
| Home location zones | Skeleton rows reserve card height | Localized no-zones message | Inline alert with retry | Query cache keeps last known zones | Add long-name visual fixture |
| Home comparison | Four-card skeleton preserves layout | Full-width region message | Full-width region message with retry | Keep stale cards while refetching | Add explicit stale badge |
| `/services` discovery | Filter form stays visible; list/map skeletons | Full-width no-results explanation | Retry state without losing filters | Cached public catalog | Persist one-query map/list loading |
| Provider profile | Hero/content/booking skeletons | Safe gallery and offer fallbacks | Route error boundary + retry | Public cache | Gallery moderation state |
| Legal/help/about | Shell renders immediately | Structured content, no blank panels | Route error boundary | Static pages remain readable | Final legal copy review |

## Interaction rules

- Header and footer render independently of data queries.
- Skeletons occupy the same major block height as their resolved content.
- Retry never clears user-selected filters or form drafts.
- Empty and error states use different copy and `role` semantics.
- Buttons, links, tabs and menu rows expose a pointer cursor and visible focus.
- Long localized labels wrap inside cards instead of changing the page grid.
- Client and admin appeal queues use the same state-card contract; decisions
  always require an explicit reason and are persisted in the audit trail.
