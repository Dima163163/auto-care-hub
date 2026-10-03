# Subagent Rules

User instructions take precedence. Spawn agents only when the user explicitly
requests subagents or parallel agent work. Role delegation and audit cadence below
apply only within that authorization. An explicit user transfer of frontend
ownership permits the main agent to implement the approved scope directly; record
that decision in PROJECT_CONTEXT.md. Do not ask for the same permission again.


Use read-only subagents for audits unless the user explicitly approves edits.
The canonical machine-readable profiles live in this project's ignored
`.codex/agents/` directory. Keep byte-identical synchronized copies in
`~/.codex/agents` so Codex can reuse the roles across sessions. Do not commit
the profiles. The main agent loads the relevant project profile instructions
when spawning an available subagent role.

## Permanent audit team

- `business-analyst`: workflows, requirements, KPIs, business value, and risk.
- `ux-ui-auditor`: usability, accessibility, responsive states, and visual
  consistency. It may recommend design changes but cannot bypass the design
  lock in `AGENTS.md`.
- `design-systems-lead`: visual-system coherence, tokens, component states,
  responsive composition, accessibility, motion, localization, and production
  polish. It is read-only and cannot bypass the design lock.
- `test-quality-auditor`: risk-based unit, integration, contract, E2E,
  migration, concurrency, and recovery coverage.
- `system-architect`: system design, boundaries, scalability, resilience,
  observability, and rollout strategy.
- `type-safety-auditor`: TypeScript and runtime-contract parity.
- `backend-security-auditor`: backend correctness, authorization, data
  integrity, migrations, provider failures, and application security.
- `feature-strategist`: feasible, non-duplicative product improvements and MVP
  acceptance criteria.
- `feature-implementer`: implements only an explicitly approved feature in an
  assigned write scope; it is not an audit role.
- `frontend-senior-developer`: implements explicitly assigned JavaScript,
  TypeScript, React, Next.js, and FSD frontend work; it is not an audit role.

## Frontend ownership

- Delegate all production frontend code, frontend tests, frontend mocks, and
  browser verification to `frontend-senior-developer` with explicit file or
  FSD-layer ownership and acceptance criteria.
- For cross-layer work, split the task so this role owns the frontend slice and
  the relevant backend role owns the backend slice.
- The main agent coordinates scope, inspects the frontend agent's diff, checks
  architecture and product fit, validates reported commands and evidence, and
  sends findings back for correction. The main agent does not silently replace
  the frontend agent's implementation.
- Review findings remain owned by `frontend-senior-developer`: it corrects the
  frontend code and re-runs the affected verification before another review.
- If the frontend role is unavailable or blocked, stop and report it. Transfer
  frontend implementation ownership only after an explicit user decision and
  a handoff of files, state, acceptance criteria, and outstanding checks.
- Direct frontend implementation by the main agent is an emergency fallback
  only when the frontend role is technically unavailable and the user
  explicitly approves that fallback.
- The frontend role never commits, pushes, merges, changes models, installs
  skills, expands scope, or bypasses the design lock on its own.

## Design/frontend pairing

- For visual, interaction, accessibility, responsive, content, motion, media,
  or token work, run `design-systems-lead` and `frontend-senior-developer`
  independently before implementation when both roles are available.
- The design lead owns user outcome, design intent, evidence, state matrix,
  and rendered-quality review; the frontend senior owns implementation,
  browser verification, and code correction.
- The main agent reconciles their reports, records conflicts and decisions, and
  requires the three design confirmations before any visual-composition change.
- A design review cannot be closed by a screenshot alone: include keyboard,
  accessibility tree, localization, responsive, reduced-motion, media, and
  performance evidence where relevant.

## Runtime role mapping

The active Codex task may cache custom `agent_type` names at startup. When a
saved profile name is not accepted yet, spawn the closest built-in role and
include the local TOML instructions in the delegated task:

- `business-analyst` and `feature-strategist` -> `default`;
- `ux-ui-auditor` -> `ui-designer`;
- `test-quality-auditor` -> `code-reviewer`;
- `system-architect` and `backend-security-auditor` -> `backend-architect`;
- `type-safety-auditor` -> `typescript-expert`;
- `feature-implementer` -> `worker` with explicit file ownership.
- `frontend-senior-developer` -> `frontend-developer` with explicit file and
  FSD-layer ownership.
- `design-systems-lead` -> `ui-designer` with the local TOML instructions and
  explicit read-only audit scope.

Retry direct custom names in a newly initialized task; do not delay a required
audit solely because the current task cached the older role catalog.

## Audit cadence

Persist counters and audit outcomes in `.codex/subagent-audit-log.md`.

1. After every 5 completed implementation plan items, run the smallest relevant
   pair:
   - backend work: `backend-security-auditor` and `test-quality-auditor`;
   - frontend work: `ux-ui-auditor` and `type-safety-auditor`;
   - design-system work: `design-systems-lead` and `ux-ui-auditor`;
   - cross-layer work: `system-architect` and `test-quality-auditor`;
   - product or workflow work: `business-analyst` and `feature-strategist`.
2. After every 15 completed implementation plan items, at a phase boundary, or
   before a release-readiness decision, run one full rotating audit covering all
   eight audit roles, including `design-systems-lead`. Run roles in small parallel batches and consolidate duplicate
   findings.
3. Run an immediate targeted audit regardless of counters after changes to
   authentication, authorization, payments, migrations, booking concurrency,
   destructive data operations, privacy/export behavior, or a production
   incident fix.
4. Do not run an audit just because documentation or the audit log changed.
5. Reset only the counter for the audit that actually ran. Record unresolved
   findings as proposed plan items; do not silently add them to scope when user
   approval is required.

## Operating limits

- Give every subagent a concrete scope and ask for evidence-based findings.
- Use the smallest relevant set instead of launching the full team for routine
  steps.
- Subagents must not commit, push, merge, change the project plan, or edit files
  during an audit.
- The main agent consolidates overlap, verifies actionable findings, applies
  agreed changes, runs checks, and updates the audit log.
- Subagents do not have automatic hard control over code style or product scope.
  The main agent remains responsible for final engineering judgment.

## Profile development

- Treat "training" as explicit maintenance of prompts, checklists, evidence
  requirements, and role boundaries. It is not model fine-tuning.
- Review profile quality after a full rotating audit or when the same missed
  defect pattern appears twice.
- Add a rule only when a concrete audit result shows that it would improve
  precision, coverage, or reduce duplicate findings.
- Record profile changes and their evidence in `.codex/subagent-audit-log.md`.
- Keep the project and user-level TOML copies byte-identical after an update.
- Subagents may propose a new or updated skill, model change, or broader tool
  access when they state the concrete gap, expected benefit, scope, cost, and
  risk. Do not apply any such proposal without explicit user approval.
