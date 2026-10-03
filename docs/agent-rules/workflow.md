# Workflow Rules

The canonical publication policy is also described in README.md and
`docs/REPOSITORY_PROTECTION.md`.

- Start an isolated feature branch from current `dev`; bring latest `main` into
  `dev` with a normal merge when needed. Preserve user changes in the primary
  checkout; use an isolated worktree instead of resetting or broad stashing.
- Each approved fix gets its own commit. Use explicit `git add <file>`; inspect
  status and staged diff. Keep branches after merge.
- Publish to `dev` under the user's existing authorization and batching request.
  A requested single push means collect all fix commits before publication.
- `main` is protected: use the `dev` → `main` PR. Both exact-candidate Quality
  events and the required `Application CI` checks must pass. Use normal merge
  or auto-merge, preserving branches. Never direct-push main, force-push,
  bypass checks, or manufacture reviewer approval.
- If a workflow token cannot create/run the PR, create the same protected PR
  through the owner's authorized session; do not weaken protection.
- Run appropriate lint/types/tests for changed behavior, then the repository
  Quality gates on the complete candidate. Database tests use only explicitly
  isolated test targets. Docs-only changes require diff/link review.
- Record each completed fix and actual evidence/limitations in PROJECT_PLAN.md,
  PROJECT_CONTEXT.md and the working audit registry. External pilot evidence
  cannot be inferred from local tests; the 54-gate freeze stays canonical.
- Preserve unrelated generated files, including `public/mockServiceWorker.js`.
