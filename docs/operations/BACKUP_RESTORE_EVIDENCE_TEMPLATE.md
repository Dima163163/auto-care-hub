# Backup and restore evidence template

Copy this template for every staging or production rehearsal. Never put
credentials, database dumps, private attachment content, VINs, phone numbers,
or access tokens in the evidence record.

## Run metadata

| Field | Value |
| --- | --- |
| Environment |  |
| Backup job ID |  |
| Restore job ID |  |
| Operator / ticket |  |
| Started (UTC) |  |
| Finished (UTC) |  |
| Backup archive age |  |
| Checksum |  |
| Isolated restore target |  |

## Recovery result

| Check | Result / evidence reference |
| --- | --- |
| Encrypted archive created |  |
| Checksum verified before restore |  |
| Migration version verified |  |
| Booking and quote snapshots present |  |
| Trust and audit rows present |  |
| Private media remains non-public |  |
| API health/discovery smoke |  |
| Worker/outbox smoke |  |
| RPO (minutes) |  |
| RTO (minutes) |  |
| Missing rows or orphaned objects |  |
| Follow-up incident / remediation |  |

Approval requires an attached checksum, timings for RPO/RTO, and evidence that
the restored target was isolated from the source database. Destroy the target
only after the operator and recovery owner sign off.
