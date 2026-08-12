# Project Skills

These are lightweight project-specific checklists for future sessions and
subagents. They complement `AGENTS.md`; they are not a replacement for targeted
code reading.

## Specialized Agent Skills (Installed)

The following skills are available in `.agents/skills/` and provide expert guidance:

- **`backend-dev-guidelines`**: Production-grade backend standards and architecture patterns.
- **`backend-patterns`**: Scalable and maintainable backend architectural solutions.
- **`nodejs-backend-patterns`**: Best practices specifically for Node.js and Fastify ecosystems.
- **`frontend-design`**: Principles for creating modern, aesthetic, and accessible UI/UX.
- **`frontend-patterns`**: Industry-standard frontend architectural patterns and state management.
- **`vercel-react-best-practices`**: Optimized patterns for high-performance React applications.
- **`typescript`**: Comprehensive TypeScript coding standards and idiomatic patterns.
- **`typescript-advanced-types`**: Complex type safety and advanced utility patterns.
- **`design-system`**: Guidelines for building consistent, component-driven design systems.

## Frontend Review
...
Use for React, routing, RTK Query, responsive layout, accessibility, and i18n.

Checklist:
- Confirm the touched component follows nearby patterns.
- Keep server-state ownership clear; avoid duplicate RTK Query calls when props
  can carry already loaded data.
- Check loading, empty, error, and success states.
- Verify mobile and desktop layouts.
- Use existing i18n helpers for user-facing strings.
- Check touched components for decomposition opportunities; prefer focused
  hooks/components around the 100-150 line range when it improves clarity.
- Add or update focused tests for changed behavior.

## Backend Review

Use for Fastify routes, services, DTOs, auth, validation, database behavior, and
API contracts.

Checklist:
- Validate request input with existing Zod/DTO patterns.
- Return stable error codes or structured errors that the frontend can translate.
- Keep auth and ownership checks explicit.
- Review data integrity risks such as double booking or orphaned records.
- Add focused tests when the touched behavior has meaningful risk.
- Build the backend before merging backend changes.

## UI/UX Review

Use for visual hierarchy, navigation, forms, workspace ergonomics, maps,
automotive imagery, comparison, messaging and dense provider/admin workflows.

Checklist:
- Make primary actions visually distinct and reachable.
- Ensure nav items look interactive, not like plain text.
- Keep dense admin/owner screens scannable.
- Avoid nested cards and oversized marketing patterns inside app workspaces.
- Check long text, narrow widths, and touch targets.
- Prefer real or generated bitmap assets for cabinet imagery.

## TypeScript Review

Use for API types, nullable fields, DTOs, RTK Query contracts, and shared models.

Checklist:
- Prefer explicit types over `any`.
- Align frontend types with backend response contracts.
- Make nullable and optional fields intentional.
- Avoid broad type assertions unless there is a clear boundary.
- Destructure when it improves clarity and does not obscure data flow.

## Debugging Review

Use for regressions, broken flows, and suspicious behavior.

Checklist:
- Reproduce the issue with the smallest practical path.
- Check browser console or test output before editing.
- Fix the narrow cause first.
- Add regression coverage when the failure is user-visible.
- Re-run the specific failing path after the fix.
