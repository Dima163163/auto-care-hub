# Resource-level capacity policy

The pure capacity policy supports specialists, bays, lifts and equipment in
addition to branch appointment capacity. A reservation can require explicit
resource IDs, or the selector can choose one free resource for each required
resource type. Overlap is half-open (`start < otherEnd && end > otherStart`),
so adjacent appointments do not conflict.

`capacity-resource.test.ts` covers occupied resources, independent resources,
deterministic specialist selection and exhausted resource types. Database
reservation wiring must use the same policy inside the existing pessimistic
request/slot transaction before a resource-backed service is enabled.
