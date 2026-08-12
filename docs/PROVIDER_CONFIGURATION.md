# Provider Configuration Handoff

## Email

Production SMTP must be configured and verified through the hosting provider's
secret store. Keep credentials out of the repository and use the existing
startup verification before enabling registration and password-recovery flows.

## Error monitoring

Register an `ExternalErrorReporter` adapter during backend bootstrap when an
external monitoring provider is selected. The adapter receives serialized
errors and sanitized context only. Provider failures are swallowed and counted
by `external_error_reports_total` with `sent`, `failed`, or `disabled` outcomes.

## Cabinet images

The current provider is `FileSystemCabinetImageStorage`, using the owned
`/uploads/cabinets/<uuid>.<jpg|png|webp>` key contract. It is suitable for a
single persistent local volume. Set `CABINET_UPLOADS_DIR` to the mounted volume
path when the application working directory is ephemeral. Before running
multiple replicas or deployments without shared storage, replace the provider
with an S3-compatible implementation while keeping the same object-key and
metadata bounds. The environment path changes where the filesystem provider
stores objects; it does not by itself prove that the volume is durable or
shared.

## Payments

Stripe webhook events older than 24 hours or more than five minutes in the
future are rejected before event claiming. Reconciliation classifies provider
failures as retryable, permanent, or escalation-worthy; inspect the related
metrics and system incidents during provider recovery.

## Password breach checks

New password writes can use the HIBP-compatible k-anonymity range API without
sending the password or its full hash. `BREACHED_PASSWORD_CHECK_MODE` accepts
`off`, `shadow`, or `enforce`; local environments default to `off`, while
production defaults to `shadow`. Use `enforce` only after validating provider
availability because an upstream timeout or oversized response rejects new
password writes. Responses are bounded and requests have a short timeout.
