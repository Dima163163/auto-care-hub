# ADR-0005: Provider membership is the authorization boundary

## Status

Proposed for user approval.

## Context

The legacy baseline stores a global `owner` role and directly associates cabinets with an
owner user. AutoCare Hub needs provider organizations, multiple locations,
teams, invitations and permission differences. A person may work for several
providers or only selected locations.

## Decision

Keep client/admin/super-admin as platform-level concerns. Grant business access
through `ProviderMembership` with active status, explicit permission set/role
template and optional location scope.

Every provider-scoped mutation and non-public read verifies:

1. authenticated active user;
2. active provider membership;
3. required permission;
4. target resource belongs to the provider and allowed location scope.

The legacy global `owner` role remains transitional only while old routes exist.

## Consequences

- Supports owners, managers and staff without creating many global roles.
- Requires negative IDOR tests for every provider/location resource.
- Membership revocation immediately removes provider access without blocking the
  person's customer account.
- New AutoCare modules cannot use `user.role === owner` as sufficient access.

## Revisit when

Enterprise providers require more complex policy attributes than the approved
permission/location model can express.
