# ADR-0001: Evolve the existing TypeScript stack

## Status

Proposed for user approval.

## Context

The supplied draft architecture assumed a new Next.js/FastAPI/SQLAlchemy/Alembic
monorepo. The actual copied repository already has a mature React/Vite frontend
and Fastify/TypeORM backend with authentication, security, background delivery,
observability and test infrastructure.

AutoCare Hub needs a new automotive domain, not a different implementation
language.

## Decision

Keep the current React/TypeScript and Fastify/TypeScript modular-monolith stack.
Create new AutoCare domain modules and versioned API contracts inside the
current repository. Evaluate public-page prerender/SSR separately based on SEO
requirements; do not make a wholesale Next.js rewrite the default.

## Consequences

Positive:

- preserves substantial production-oriented work;
- keeps shared TypeScript contracts for web and future mobile;
- reduces security and operational reimplementation risk;
- allows vertical migration and continuous verification.

Negative:

- legacy and target domains temporarily coexist;
- old naming/contracts must be actively isolated;
- public SEO needs a later explicit rendering decision.

## Rejected alternative

Start a new Next.js/FastAPI project and port features. This duplicates mature
platform work and delays validation of the actual AutoCare product.

## Revisit when

Measured requirements cannot be met by the current stack, or an approved SEO/
organizational constraint makes a partial frontend rendering change necessary.
