# Real pilot evidence template

Use this template to prepare `PILOT_EVIDENCE_FILE`. Store only anonymized
references (`provider-01`, `client-01`, `vehicle-01`) — never commit names,
phone numbers, email addresses, VINs, plate values, chat text or photo bytes.

The file is accepted only when it is marked `source: "real"` and
`environment: "staging"` or `"production"`:

```json
{
  "schemaVersion": 1,
  "source": "real",
  "environment": "staging",
  "marketId": "<launch-market>",
  "collectedAt": "<ISO-8601 timestamp>",
  "providers": [
    { "id": "provider-01", "verified": true, "consentRecorded": true, "bookingMode": "online" },
    { "id": "provider-02", "verified": true, "consentRecorded": true, "bookingMode": "request_call" }
  ],
  "clients": [
    { "id": "client-01", "consentRecorded": true, "vehicleRefs": ["vehicle-01"] }
  ],
  "vehicles": [
    { "id": "vehicle-01", "clientId": "client-01", "make": "<make>", "model": "<model>", "year": 2021, "plateCaptured": true, "vinCaptured": false }
  ],
  "journeys": [
    {
      "id": "journey-01",
      "providerId": "provider-01",
      "clientId": "client-01",
      "path": "fixed",
      "events": ["request_created", "completed", "review_submitted"],
      "reviewPhotoCount": 0
    }
  ],
  "metrics": {
    "recordCount": 0,
    "responseSamples": 0,
    "responseP50Minutes": null,
    "responseP95Minutes": null,
    "confirmationSamples": 0,
    "confirmationRatePercent": 0,
    "bookingCount": 0,
    "cancelCount": 0,
    "noShowCount": 0,
    "duplicateSubmissionChecks": 0,
    "duplicateRequestsCreated": 0
  },
  "privacy": { "piiRedacted": true, "evidenceRetentionDays": 90 }
}
```

The completed file must contain 2 providers, 5–10 clients, one captured plate
metadata record per client, both fixed and quote paths, every lifecycle event
listed in the policy, at least one review photo, five response/confirmation
samples and a duplicate-submission check with zero duplicate requests.

Validate it with:

```bash
PILOT_EVIDENCE_FILE=/secure/path/pilot-evidence.json npm run check:pilot-evidence
```

Aggregate reliability values must be reproducible from anonymized actor/journey
rows. Keep the redacted CSV outside Git and bind it to the evidence before
promotion:

```bash
PILOT_METRICS_CSV=/secure/path/pilot-metrics.csv \
PILOT_EVIDENCE_FILE=/secure/path/pilot-evidence.json \
npm run check:pilot-metrics
```

The consistency gate rejects duplicate participant/journey rows, mismatched
aggregates and response/confirmation values outside the approved thresholds.
