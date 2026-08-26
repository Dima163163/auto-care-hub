# Resource-level capacity policy

The pure capacity policy supports specialists, bays, lifts and equipment in
addition to branch appointment capacity. A reservation can require explicit
resource IDs, or the selector can choose one free resource for each required
resource type. Overlap is half-open (`start < otherEnd && end > otherStart`),
so adjacent appointments do not conflict.

`capacity-resource.test.ts` covers occupied resources, independent resources,
deterministic specialist selection and exhausted resource types. PostgreSQL
reservations use the same policy inside the pessimistic request/slot
transaction: instant bookings, quote acceptance, owner confirmation and
accepted reschedules reserve resources, while cancellation, no-show and
completion release them. The owner calendar reads the active reservation
window per branch and resource type.

New branches receive predictable specialist and bay rows, plus one lift per
configured workstation. Owners can rename, deactivate or add equipment and
additional resources through the owner capacity API; service offerings may
pin explicit resource IDs or require a resource type.
