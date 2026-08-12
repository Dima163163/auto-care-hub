# AutoCare Hub Project Instructions

## Design Change Lock
**CRITICAL RULE:** Design is locked by default. Gemini, Codex, Claude Code, and
any other AI coding tool must not change layout, spacing, colors, typography,
icons, imagery, animation, responsive breakpoints, component visual structure,
or user-facing visual composition unless the user gives three separate explicit
confirmations in the current conversation.

The three confirmations must be:
1. Approval to change the design at all.
2. Approval of the concrete visual scope to change.
3. Final approval to implement the design change.

Bug fixes that do not alter visual appearance may proceed normally. If a
functional fix requires a visible design change, stop and request all three
confirmations before editing.

## Git Workflow
**CRITICAL RULE:** Do NOT push branches to the remote repository (e.g., `git push origin ...`) until the user has explicitly reviewed and approved the local changes. Always wait for user confirmation before pushing.

When the user approves and you are ready to push changes or merge a feature branch into `main` or `dev`, ALWAYS follow this sequence to ensure the local branch is up-to-date with the remote target branch:

1. Fetch and pull the latest changes from the remote target branch (e.g., `main` or `dev`).
2. Merge those target branch changes into the current feature branch (resolving any conflicts if necessary).
3. Push the feature branch to `origin`.
4. Checkout the target branch (e.g., `main`), merge the feature branch into it, and push to `origin`.
5. Checkout the feature branch again to continue working.

Example:
```bash
git checkout main
git pull origin main
git checkout feature/your-branch
git merge main
git push origin feature/your-branch
git checkout main
git merge feature/your-branch
git push origin main
git checkout feature/your-branch
```
