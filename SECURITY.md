# Security Overview — Current Platform Baseline

This document describes the implemented security baseline inherited from the
legacy booking product. AutoCare Hub will reuse these controls, but every new provider,
location, vehicle, inquiry, message, attachment, quote, bonus and subscription
resource still requires explicit object-level authorization and privacy tests.
See `ARCHITECTURE.md` for the target domain model.

## Security Model

AutoCare Hub follows a modern, multi-layered security approach:

- **Authentication:** Uses short-lived Access Tokens (JWT) and persistent Refresh Tokens stored in `httpOnly`, `Secure`, and `SameSite: Strict` cookies.
- **In-Memory Storage:** To mitigate XSS risks, Access Tokens are stored only in the application's memory and are never persisted to `localStorage` or `sessionStorage`.
- **CSRF Protection:** Implements a double-submit cookie pattern with custom headers (`X-CSRF-Token`) for all state-changing requests.
- **Rate Limiting:** Protects sensitive endpoints (Login, Register, Password Reset) using a Redis-backed rate limiter with a fail-safe fallback to in-memory limiting.
- **Security Headers:** Comprehensive CSP, HSTS, and XSS protection headers configured via Helmet.

## Roles & Permissions

- **`client`**: Current legacy client role; remains the customer platform role.
- **`owner`**: Legacy owner role; target provider access moves to scoped
  `ProviderMembership` authorization.
- **`admin`**: Moderation role. Target scope includes providers, catalog,
  reviews and reports.
- **`super_admin`**: Platform owner. Full access to admin features, role management, and system-wide configurations.

## Implemented Protections

### Authentication & Sessions
- **Session Revocation:** Database-backed session tracking allowing users to view and revoke active sessions across different devices.
- **Token Versioning:** Automatic invalidation of all active tokens upon password change or reset.
- **Email Verification:** Mandatory verification for sensitive actions. Tokens are hashed and stored with expiry.

### Data Protection
- **Password Hardening:** Secure password hashing (Argon2/Bcrypt). One-time password setup/reset flows with secure token exchange.
- **Database Security:** Automated compressed daily backups with 7-day retention. Mandatory SSL/TLS for all production database connections.
- **HTML Escaping:** Mandatory server-side escaping of all user-generated content in email templates to prevent Stored XSS.

### Infrastructure & Uploads
- **Secure Uploads:** Image uploads are restricted to authenticated owners, validated via MIME magic bytes, and size-limited.
- **Audit Logging:** Comprehensive tracking of all administrative and security-sensitive actions (role changes, moderation, status updates).
- **CSP (Content Security Policy):** Strict policy restricting script and style sources, disabling `unsafe-eval` in production, and allowing only the domains required for application media.

## Important Security Decisions

- **Environment Isolation:** Secrets and credentials are managed via environment variables; `.env.example` contains only non-sensitive templates.
- **Secure Defaults:** Production mode enforces strict SSL, HSTS, and secure cookie flags.
- **Minimal Exposure:** Public API endpoints are rate-limited and protected against common abuse patterns.

## Known Trade-offs & Future Hardening

- **Storage:** Legacy cabinet photos use local filesystem storage. AutoCare
  requires separate public provider media and private message/damage/document
  storage, preferably S3-compatible object storage in production.
- **Scanning:** Automated dependency and vulnerability scanning (e.g., Snyk) is recommended for the CI/CD pipeline.

## Verification & Maintenance

### Recent hardening

- Request bodies, cursors, request IDs, OAuth profiles, audit actions, and
  audit/incident metadata now have explicit bounds before parsing or storage.
- OAuth callbacks require provider-bound, shape-validated state and a
  production HTTPS redirect policy; expired link requests are removed in
  bounded maintenance batches.
- Readiness reports database pool pressure through finite metrics and creates a
  system incident when configured saturation thresholds are exceeded.
- Maintenance cycles and shutdown are bounded and idempotent, so a repeated
  termination signal cannot start a second cleanup drain.

Security changes should be verified using the following workflow:

1.  **Static Analysis:** Run linting and type checks.
2.  **Automated Testing:** Execute the full test suite (backend & frontend).
3.  **Manual Probe:** Verify headers and rate-limit responses via `curl` or browser dev tools.
4.  **Schema Check:** Ensure migrations follow established security patterns.
