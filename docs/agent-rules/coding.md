# Coding Rules

- Follow existing project structure and local patterns.
- Prefer small, focused changes over broad refactors.
- Use destructuring where it improves readability or matches surrounding code.
  Do not rewrite unrelated code only to destructure it.
- Keep UI text in the existing custom i18n system whenever possible.
- For backend-driven labels or enum-like values, prefer stable codes from the
  backend and translate them on the frontend.
- If backend localization is needed, return both Russian and English values or a
  locale-aware response explicitly.
- Use lucide icons for common UI actions when an icon exists.
- Keep mobile and desktop layouts responsive.
- Avoid visible instructional text that explains how the UI works unless the
  product flow really needs it.

## Design Change Lock

- Design is locked by default for Codex, Gemini, Claude Code, and subagents.
- Do not change layout, spacing, colors, typography, icons, imagery, animation,
  responsive breakpoints, component visual structure, or user-facing visual
  composition without three separate explicit confirmations from the user in the
  current thread.
- Required confirmations:
  1. Approval to change the design at all.
  2. Approval of the concrete visual scope to change.
  3. Final approval to implement the design change.
- Non-visual bug fixes may proceed normally.
- If a functional fix would require a visible design change, stop and request
  the three confirmations before editing.

## Frontend Decomposition

- When touching frontend components, check whether the changed component mixes
  data loading, mutations, form state, validation, layout, and repeated field
  markup.
- Prefer extracting focused hooks/components when it keeps files around
  100-150 lines and improves readability without creating premature
  abstraction.
- Do not split code only to satisfy a line count if the result makes local data
  flow harder to understand.

## Cabinet Images

Current mock cabinet images live under `public/images/cabinets`.

Planned real upload behavior:
- Users should be able to upload a cabinet image in later steps.
- Maximum file size: 1 MB.
- Accept JPEG, PNG, and WebP unless product requirements change.
- Validate on both frontend and backend.
- Backend should reject invalid type or size with a user-friendly error code.
