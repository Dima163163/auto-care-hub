# Local pilot quality evidence — 2026-08-25

This record covers the disposable Docker/PostgreSQL pilot dataset. It verifies
that the local API can expose a usable catalog; it is not evidence of real
provider response SLOs or market supply.

## Commands

```bash
npm --prefix server run check:pilot-quality -- --json
npm --prefix server run check:pilot-reliability -- --json
```

## Quality gate

The quality gate passed:

- active providers: **3** (threshold ≥ 2);
- active offers: **17** (threshold ≥ 8);
- providers with offers: **3**;
- offer coverage: **100%**;
- offers with prices: **17 / 17 (100%)**;
- active market: **1**;
- service locations: **3**.

The dataset is sufficient for local filtering, price comparison, booking and
owner branch-scope checks. It does not establish real-world price correctness,
service density or provider availability.

## Reliability gate

The reliability gate remains intentionally blocked:

- provider response samples: **0** (threshold ≥ 5);
- provider response p95: **not available**;
- confirmed bookings: **1**;
- confirmation samples: **1** (threshold ≥ 5);
- confirmation reliability: **100%** for the single local sample;
- booking conflicts: **0**.

The single confirmed booking proves the local request → quote → accept →
confirm path, but it must not be presented as a provider SLA. Closing this gate
requires recruited services and customers, timestamps from their real actions,
and a staging or production-like environment.

## Real pilot evidence gate

The fail-closed validator is now available:

```bash
PILOT_EVIDENCE_FILE=/secure/path/pilot-evidence.json npm run check:pilot-evidence
```

No real evidence file is committed in this repository. The gate intentionally
remains blocked until two verified providers, 5–10 consented customers, real
vehicle/plate metadata, the complete request/quote/booking/review/bonus/
complaint/support journey and measured response/booking metrics are collected.
