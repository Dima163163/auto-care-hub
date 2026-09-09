# Legal publication checklist

Status: draft gate — not legal advice

The three public documents are intentionally marked as informational drafts in
the UI. They may be improved in code, but cannot be called final until the
operating entity and the applicable local wording are confirmed.

## Required owner input

- [ ] Legal entity name, registration number and registered address.
- [ ] Operator/controller name for personal-data processing.
- [ ] Public support, privacy and abuse-reporting contacts.
- [ ] Data-hosting and transfer locations, subprocessors and retention periods.
- [ ] Consumer-facing cancellation, rescheduling, no-show and complaint wording.
- [ ] Controller/processor roles for provider-uploaded customer photos and VINs.
- [ ] Governing law, dispute-resolution venue and language precedence.

## Country review packets

- [ ] Russia: consumer information, personal-data notices and electronic
  communications wording reviewed for the launch entity.
- [ ] Spain: consumer and distance-service wording, GDPR controller notice and
  Spanish-language precedence reviewed.
- [ ] Moldova: consumer, privacy and electronic-communications wording reviewed
  for the operating entity.
- [ ] Transnistria: local operating, consumer and privacy requirements reviewed
  separately from Moldova; confirm which entity and support channel applies.

## Release gate

The draft banner can be removed only after every applicable packet is signed
off by the owner and counsel. Until then, no page may imply that AutoCare Hub
collects repair payments, guarantees a provider's workmanship, or has a final
legal controller designation.

## Implemented in the application

- [x] Registration requires acceptance of the user agreement and acknowledgement
  of the privacy policy on both the client and server.
- [x] Consent records keep the document version, action, source, timestamp and
  keyed network/browser evidence without storing the raw IP or user-agent.
- [x] Service requests require a separate processing confirmation covering
  contact details, vehicle data and uploaded photos; the record is linked to the
  request identifier.
- [x] Optional analytics and marketing consents can be granted or revoked from
  the profile and are included in the personal-data export.
- [x] Current provider visibility counters are explicitly documented as daily,
  aggregated operational metrics without account or device identifiers; the
  optional analytics switch is reserved for future optional telemetry.
- [x] OAuth account creation requires the same legal confirmations through a
  short-lived server-side consent request.

## Owner-only actions before production

- [ ] Replace draft versions with counsel-approved versions and set
  `LEGAL_DOCUMENT_STATUS=final` only after approval.
- [ ] Fill the operator/controller identity, address, privacy contact, hosting
  locations, subprocessors and retention schedule.
- [ ] Submit the applicable regulator notices and keep the external references
  in the deployment records. The repository intentionally does not perform or
  claim those filings.
