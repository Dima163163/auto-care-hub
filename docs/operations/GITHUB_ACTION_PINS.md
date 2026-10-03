# GitHub Actions: immutable references

Resolved from the existing official major refs on 2026-10-03 UTC. This change
pins the code already selected by those refs; it does not upgrade action majors.
`dependency-review-action v4` is a branch; the other listed refs are tags.

| Action | Major ref | Verified commit |
| --- | --- | --- |
| actions/checkout | v4 | [11d5960a3267](https://github.com/actions/checkout/commit/11d5960a326750d5838078e36cf38b85af677262) |
| actions/setup-node | v4 | [49933ea5288c](https://github.com/actions/setup-node/commit/49933ea5288caeca8642d1e84afbd3f7d6820020) |
| actions/dependency-review-action | v4 | [2031cfc08025](https://github.com/actions/dependency-review-action/commit/2031cfc080254a8a887f58cffee85186f0e49e48) |
| actions/upload-artifact | v4 | [ea165f8d65b6](https://github.com/actions/upload-artifact/commit/ea165f8d65b6e75b540449e92b4886f43607fa02) |
| actions/attest | v4 | [1e69f48acb82](https://github.com/actions/attest/commit/1e69f48acb82d1966a394da916b4c1698aa569d6) |
| gitleaks/gitleaks-action | v2 | [ff98106e4c7b](https://github.com/gitleaks/gitleaks-action/commit/ff98106e4c7b2bc287b24eaf42907196329070c7) |

Updates are ordinary reviewed commits targeting dev. Resolve the official ref,
inspect the upstream diff and action.yml runtime/permissions, replace the full
SHA and version comment together, and run check:action-pins plus complete Quality.
Keep existing job permissions; do not add secrets or bypass protected promotion.
Release attestation still requires external release/evidence validation.
