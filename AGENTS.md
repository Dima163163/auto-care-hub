# Agent Instructions

This is the main entry file for Codex and subagents. Keep it short. Read it
before scanning the repository, then open only the referenced files needed for
the current task.

## First Read

1. `PROJECT_CONTEXT.md` - compressed project memory and current handoff.
2. `SKILLS.md` - short project-specific review checklists.
3. `.codex/rules/workflow.md` - git workflow, checks, and local dirty-file
   handling.
4. `.codex/rules/project-structure.md` - stack and important paths.
5. `.codex/rules/coding.md` - coding, i18n, UI, and image-upload rules.
6. `.codex/rules/subagents.md` - read-only subagent roles and limits.

For auth, provider/admin permissions, messaging privacy, uploads, subscriptions,
bonuses, deployment security, CSRF/XSS/rate-limit, Redis, or password-flow
tasks, read `SECURITY_CONTEXT.md` for target AutoCare rules and `SECURITY.md`
for the implemented platform baseline.

## Project

AutoCare Hub is being evolved from a legacy cabinet-booking baseline into a
production-style automotive-service aggregator and provider SaaS product with a
React frontend and a TypeScript Fastify backend.

Frontend root: `.`
Backend root: `server`

## Non-Negotiable Workflow

- One task means one feature branch from current `main`.
- Do not delete feature branches after merge.
- After user confirmation: commit, push the feature branch, merge it into
  `main`, then push `main`.
- Use explicit `git add <file>` commands. Do not use `git add .`.
- Preserve unrelated local changes.
- Every completed implementation step must be reflected in `PROJECT_PLAN.md`
  before the final response. If the change affects future handoff, deployment,
  debugging, or follow-up work, also update `PROJECT_CONTEXT.md`.

## Design Change Lock

Design is locked by default for all AI coding tools, including Codex, Gemini,
Claude Code, and subagents. Do not change layout, spacing, colors, typography,
icons, imagery, animation, responsive breakpoints, component visual structure,
or user-facing visual composition unless the user gives three separate explicit
confirmations in the current thread.

The three confirmations must be clear and independent:

1. Approval to change the design at all.
2. Approval of the concrete visual scope to change.
3. Final approval to implement the design change.

Bug fixes that do not alter visual appearance may proceed normally. If a
functional fix would require a visible design change, stop and request the
three confirmations before editing.

## Visual Proposal Evidence

Whenever `design-systems-lead` or another designer proposes a visual change,
the proposal must include a generated design image/mockup showing the intended
result. The proposal must explain:

- what is different from the current UI and which role, route, and state it affects;
- why the change improves a user task, comprehension, accessibility, or product
  outcome, with evidence or a clearly marked hypothesis;
- the responsive, theme, localization, loading, empty, error, success, stale,
  offline, and permission-denied implications;
- the relevant design tokens/components and implementation boundaries;
- whether the change is behavior-only, low-risk visual, or visual-composition
  work requiring all three confirmations.

The image is a proposal artifact, not implementation approval. No visual code,
asset, token, layout, or component-composition change may begin until the
proposal image, rationale, acceptance criteria, and required confirmations are
reviewed. If image generation or rendered capture is unavailable, the designer
must state the exact limitation and the proposal remains incomplete.

## Token Economy

- Do not rescan the whole project by default.
- Start with `PROJECT_CONTEXT.md`, then targeted files. Use
  `SECURITY_CONTEXT.md` instead of broad rescans for target security tasks.
- Update `PROJECT_CONTEXT.md` when a completed change affects future work.

## Current Local Caveat

Recurring unrelated generated file that should not be committed unless the task
requires it:

- `public/mockServiceWorker.js`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
