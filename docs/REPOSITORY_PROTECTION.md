# Repository protection policy

AutoCare Hub uses Git Flow with `dev` as the integration branch and `main` as
the production branch.

## Required GitHub settings for `main`

These settings must be applied by a repository administrator in GitHub because
branch protection is remote repository state and cannot be encoded by a local
Git commit alone:

- require a pull request before merging;
- require at least one approving review from a code owner;
- dismiss stale approvals after new commits;
- require the `Quality / Frontend lint, test, build` and
  `Quality / Backend build, migrations, test` checks;
- require branches to be up to date before merge;
- block force pushes and branch deletion;
- restrict direct pushes to the repository owner/release maintainers.

The checked-in `.github/CODEOWNERS` and pull-request quality workflow provide
the review and status-check contract. They do not replace the administrator's
remote branch-protection toggle.

## Local workflow

1. Work on a short-lived feature branch from `dev`.
2. Run lint, frontend tests/build and the relevant backend checks.
3. Push the feature branch and open a pull request into `dev`.
4. Review the complete diff before merging into `dev`.
5. Promote `dev` to `main` only through an approved pull request after the
   release checklist and staging evidence are complete.

Direct pushes to `main` are prohibited by policy even when a local Git client
would technically allow them.
