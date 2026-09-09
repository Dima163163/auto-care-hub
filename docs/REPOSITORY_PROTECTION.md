# Repository protection policy

AutoCare Hub uses Git Flow with `dev` as the integration branch and `main` as
the production branch.

## Required GitHub settings for `main`

These settings must be applied by a repository administrator in GitHub because
branch protection is remote repository state and cannot be encoded by a local
Git commit alone:

- under **Settings → Actions → General → Workflow permissions**, enable
  **Allow GitHub Actions to create and approve pull requests** so the protected
  promotion workflow can open the dev → main PR; this does not bypass the
  required human approval on `main`;
- require a pull request before merging;
- require at least one approving review from a code owner;
- dismiss stale approvals after new commits;
- require the aggregate `Quality / Application CI` check. It depends on
  security/dependency scanning, frontend checks and build, backend migrations,
  unit/integration checks and build, browser E2E, and real full-stack smoke;
- require branches to be up to date before merge;
- block force pushes and branch deletion;
- restrict direct pushes to the repository owner/release maintainers.

The checked-in `.github/workflows/promote-dev-to-main.yml` starts on a push to
`dev`, waits for a successful `Quality` run for that exact commit, creates or
reuses the `dev` → `main` pull request, waits for the pull-request checks, and
enables GitHub auto-merge. The workflow fails closed if the repository setting
disallows the workflow token from creating pull requests; it never attempts to
bypass protected `main` with a direct push. A failed check leaves promotion
incomplete; fix the source branch and push a new commit to run the gates again.

The checked-in `.github/CODEOWNERS`, `Quality` workflow, aggregate
`Application CI` job, and promotion workflow provide the review, status-check,
and promotion contract. They do not replace the administrator's remote
branch-protection toggle.

## Local workflow

1. Work on a short-lived feature branch from `dev`.
2. Run lint, frontend tests/build and the relevant backend checks.
3. Push the feature branch and open a pull request into `dev`.
4. Review the complete diff before merging into `dev`.
5. Let the protected promotion workflow promote `dev` to `main` after the
   complete CI gate and any configured code-owner approval pass.

Human direct pushes to `main` are prohibited by policy even when a local Git
client would technically allow them. The checked-in promotion workflow uses
only the protected `dev` → `main` pull request path after the full CI gate.
If the CI workflow fails, do not bypass it: diagnose the failing gate, fix it
on `dev`, and push again.
