# Booking, media and notification reliability — 2026-08-24

## Implemented and testable locally

- Branch capacity is persisted as `appointmentCapacity` (default `1`) and is
  protected by a pessimistic lock on the service location. Instant bookings,
  provider confirmations, quote acceptance and accepted reschedules reject a
  conflicting time with HTTP `409`.
- `autocare-capacity.integration.test.ts` runs two real PostgreSQL races: two
  manual confirmations and two instant bookings. In each race exactly one
  accepted request is retained.
- Confirmed visits receive localized in-app reminders and an idempotent email
  outbox event. The worker formats the visit in the service location timezone.
- Attachment bytes are decoded and re-encoded before storage. Development uses
  a private filesystem; production fails at startup unless S3-compatible
  private storage and ClamAV are enabled. S3 writes quarantine objects first,
  scans them, promotes clean objects under `private/`, returns short-lived
  signed GET URLs, and retention cleanup removes expired records and objects.
- `npm --prefix server run smoke:autocare-realtime` launches separate subscriber
  and publisher processes and verifies that a Redis chat event crosses the
  process boundary.

## Required environment evidence before production

1. Configure `AUTOCARE_ATTACHMENT_STORAGE_PROVIDER=s3`, bucket credentials,
   `AUTOCARE_ATTACHMENT_ANTIVIRUS_MODE=clamav`, and a reachable scanner.
2. Run one clean-file and one EICAR/malware rejection test against a disposable
   private bucket. Confirm only a signed URL can read the clean file and no
   quarantine object remains.
3. Run the retention worker against a disposable expired attachment and confirm
   the row and object are both removed.
4. Enable `REDIS_URL` or `REDIS_HOST`, then run
   `npm --prefix server run smoke:autocare-realtime` from the API environment.
5. Configure the production email provider and send a reminder through the
   outbox. Browser push requires separate VAPID keys and persisted subscription
   records; it is deliberately not enabled without those credentials.
6. Keep chat navigation disabled until the report/block workflow and moderation
   policy are approved for the MVP release.
