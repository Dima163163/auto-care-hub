# Legacy Interaction State Contract

This legacy contract defines the minimum interaction states for shared AutoCare Hub
UI primitives. New AutoCare flows use `autocare-interaction-state-contract.md`;
product screens may add domain-specific copy or recovery actions, but they must
preserve these semantics.

## State vocabulary

| State | Required behavior |
| --- | --- |
| Default | The control has a visible name, predictable value, and theme-safe surface. |
| Hover | Pointer feedback may change surface or border without changing layout. |
| Focus | Keyboard focus uses the global focus ring and remains visible in both themes. |
| Pressed | The active action is visually distinct while the pointer or key is held. |
| Disabled | The native control is disabled, cannot be activated, and remains readable. |
| Loading | The initiating action is disabled, exposes `aria-busy="true"`, and has a progress indicator. |
| Validation | Invalid fields expose `aria-invalid="true"` and the shared danger border/ring. |
| Stale | Existing data remains visible while refresh or retry status is announced. |
| Offline | The user sees a recoverable status and an action that does not pretend the write succeeded. |
| Permission denied | The reason and next safe destination are visible without exposing protected data. |

## Primitive requirements

- `Button` owns async action feedback through its typed `loading` prop. Callers
  must not add a second spinner or leave a mutation clickable while pending.
- `FloatingInput`, `FilterInput`, and `FilterSelect` preserve native input
  semantics and style `aria-invalid="true"` with semantic danger tokens.
- `StateCard` uses `status` for passive state and `alert` for recoverable
  error/offline/permission states. Loading cards expose `aria-busy`.
- `QueryRefreshError` keeps stale data visible, disables duplicate retries,
  exposes a busy alert, and settles its state on both resolve and reject.
- `Dialog` traps focus, closes on Escape, restores the opener, and only emits
  `aria-describedby` when a `DialogDescription` exists.
- `StatusBadge` and navigation state use semantic tokens and accessible names;
  unknown backend values remain visible as bounded fallbacks.

## Review checklist

Every new shared primitive or stateful screen must answer:

1. What is announced to assistive technology?
2. What prevents duplicate activation during an async operation?
3. What data remains useful when the refresh fails?
4. How does the user recover from offline or permission-denied state?
5. Does the state remain legible in light/dark themes and at 200% zoom?

The source-level gate in `scripts/check-interaction-state-contract.mjs` keeps
the non-negotiable primitive guarantees present in every release build.
