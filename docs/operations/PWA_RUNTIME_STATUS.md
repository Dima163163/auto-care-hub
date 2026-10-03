# PWA runtime status — 2026-10-04

Production runs Next.js. It currently has no PWA registration, generated manifest
or offline application shell. PWA installation, offline restart and update prompts
are therefore not a supported production capability. Native apps are in development.

The Vite compatibility build retains `PwaLifecycle`, Workbox and its 12 preview
regressions. `check:pwa-update-contract` inspects `dist/sw.js` only. These results
prove compatibility safeguards, never production Next install/offline/update or
logout cache acceptance. Existing private RTK/identity cache cleanup remains active.

N03 is addressed through the audit's explicit claim-removal option. No new visual
prompt, offline screen, service worker, cache or app-store release is introduced.
The future Next PWA implementation must verify its own immutable artifact: manifest
and icons, offline fallback, private/API/cache denial, unsaved-form update guard,
old/new worker coexistence, logout/account switch, Chrome and Safari behavior.
Visual changes still require the project's design approvals. The 54 pilot gates
and their denominator remain unchanged; Vite evidence must not close Next gates.
