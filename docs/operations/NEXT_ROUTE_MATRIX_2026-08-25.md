# Next.js route matrix

Updated: 2026-08-26

The production web process is `next start`. The existing feature tree is still
rendered inside the App Router catch-all shell through React Router; Vite is
kept only for the PWA preview and Vitest compatibility workflow. The server
allow-list lives in `src/app/next/next-route-contract.ts` and prevents unknown
paths from returning a false HTTP 200.

The route constants in `src/shared/constants/routes.ts`, the server allow-list
and this inventory are one contract. Public routes in the catch-all page are
selected for ISR with `generateStaticParams`; provider ids can be supplied at
build time with `NEXT_PUBLIC_PRERENDER_PROVIDER_IDS` (comma-separated), while
unknown provider ids remain dynamic. The `check:next-route-inventory` command
fails if a route constant is not represented below, so a new route cannot be
added to the client tree without a release-review entry.

## Route groups

| Group | Direct URL examples | Server response | Client guard |
| --- | --- | --- | --- |
| Public | `/`, `/services`, `/reviews`, `/for-owners`, `/help`, `/privacy` | 200 | none |
| Public dynamic | `/services/:providerId`, `/services/:providerId/request` | 200 | client booking guard where required |
| Legacy public redirects | `/cabinets`, `/cabinets/:id` | 200 | React Router redirect to discovery |
| Guest auth | `/login`, `/register`, `/forgot-password`, `/password/reset` | 200 | `RequireGuest` redirects authenticated users |
| Authenticated utilities | `/onboarding`, `/owner/invitations/accept`, `/notifications` | 200 | `RequireAuth` redirects to `/login` |
| Authenticated client | `/profile`, `/profile/vehicles`, `/profile/bookings`, `/profile/reviews` | 200 | `RequireAuth` redirects to `/login` |
| Owner workspace | `/owner/dashboard`, `/owner/services`, `/owner/autocare-requests`, `/owner/clients` | 200 | owner role and workspace access |
| Owner dynamic | `/owner/autocare-providers/:id`, `/owner/autocare-providers/:id/reviews`, `/owner/cabinets/:id/edit` | 200 | owner membership/branch scope |
| Admin workspace | `/admin/dashboard`, `/admin/users`, `/admin/reviews`, `/admin/security-center` | 200 | admin or super-admin role |
| Super-admin workspace | `/super-admin/dashboard` | 200 | super-admin role |
| Chat routes | `/chats`, `/owner/chats`, `/admin/chats`, `/super-admin/chats` | 200 | navigation enabled by default; feature flag is an emergency rollback |
| Unknown | any path outside the contract | 404 | Next `not-found` boundary |

## Canonical route inventory and runtime owners

Every row below is served by the Next.js App Router catch-all page. The runtime
owner names the React Router layout that renders inside that shell; it does not
mean that Vite is involved in production.

| Path | Runtime owner | Access / behavior |
| --- | --- | --- |
| `/` | `PublicLayout` | public home |
| `/reviews` | `PublicLayout` | public platform reviews |
| `/features` | `PublicLayout` | public feature overview |
| `/for-owners` | `PublicLayout` | public provider landing |
| `/about` | `PublicLayout` | public company information |
| `/favorites` | `PublicLayout` | public shell; auth action when needed |
| `/notifications` | `PublicLayout` | authenticated client |
| `/chats` | `PublicLayout` | authenticated client; navigation enabled by default |
| `/blog` | `PublicLayout` | public blog |
| `/partners` | `PublicLayout` | public partners |
| `/contacts` | `PublicLayout` | public contacts |
| `/help` | `PublicLayout` | public help center |
| `/agreement` | `PublicLayout` | public legal |
| `/rules` | `PublicLayout` | public legal |
| `/privacy` | `PublicLayout` | public legal |
| `/cabinets` | `PublicLayout` | legacy redirect to `/services` |
| `/services` | `PublicLayout` | public discovery |
| `/login` | `AuthLayout` | guest-only |
| `/login/callback` | `AuthLayout` | guest auth callback |
| `/register` | `AuthLayout` | guest-only |
| `/forgot-password` | `AuthLayout` | guest utility |
| `/password/setup` | `AuthLayout` | tokenized auth utility |
| `/password/reset` | `AuthLayout` | tokenized auth utility |
| `/verify-email` | `AuthLayout` | tokenized auth utility |
| `/onboarding` | `PublicLayout` | authenticated client onboarding |
| `/owner/invitations/accept` | `PublicLayout` | authenticated invite acceptance; does not require workspace membership |
| `/profile` | `PublicLayout` | authenticated client |
| `/profile/vehicles` | `PublicLayout` | authenticated client garage |
| `/profile/bookings` | `PublicLayout` | authenticated client bookings |
| `/profile/reviews` | `PublicLayout` | authenticated client reviews |
| `/owner/dashboard` | `OwnerLayout` | owner role |
| `/owner/autocare-providers` | `OwnerLayout` | owner provider list |
| `/owner/cabinets` | `OwnerLayout` | legacy redirect to provider list |
| `/owner/cabinets/create` | `OwnerLayout` | legacy redirect to provider list |
| `/owner/bookings` | `OwnerLayout` | legacy redirect to requests |
| `/owner/autocare-requests` | `OwnerLayout` | owner requests |
| `/owner/reviews` | `OwnerLayout` | owner reviews |
| `/owner/clients` | `OwnerLayout` | owner clients |
| `/owner/services` | `OwnerLayout` | owner service catalog |
| `/owner/chats` | `OwnerLayout` | owner chats; navigation enabled by default |
| `/admin/dashboard` | `AdminLayout` | admin or super-admin |
| `/admin/users` | `AdminLayout` | admin or super-admin |
| `/admin/owners` | `AdminLayout` | admin or super-admin |
| `/admin/cabinets` | `AdminLayout` | legacy redirect to admin dashboard |
| `/admin/reviews` | `AdminLayout` | admin or super-admin |
| `/admin/platform-reviews` | `AdminLayout` | admin or super-admin |
| `/admin/audit-logs` | `AdminLayout` | admin or super-admin |
| `/admin/security-center` | `AdminLayout` | admin or super-admin |
| `/admin/chats` | `AdminLayout` | admin or super-admin; navigation enabled by default |
| `/super-admin/dashboard` | `AdminLayout` | super-admin only |
| `/super-admin/chats` | `AdminLayout` | super-admin only; navigation enabled by default |

### Dynamic route variants

| Pattern | Examples covered by release smoke | Runtime owner |
| --- | --- | --- |
| `/services/:id` | `/services/api-proservice-moscow` and terminal-slash/query normalization | `PublicLayout` |
| `/services/:id/request` | base path and `?service=oil-change` | `PublicLayout` + client booking guard |
| `/cabinets/:id` | `/cabinets/cabinet-1` | `PublicLayout` legacy redirect |
| `/owner/autocare-providers/:id` | `/owner/autocare-providers/provider-1` | `OwnerLayout` + branch scope |
| `/owner/autocare-providers/:id/reviews` | `/owner/autocare-providers/provider-1/reviews` | `OwnerLayout` + branch scope |
| `/owner/cabinets/:id/edit` | `/owner/cabinets/provider-1/edit` | `OwnerLayout` legacy redirect |

## Direct URL verification

The browser release suite must verify both the HTTP shell and the hydrated
route:

1. Request every representative public, dynamic and protected URL directly.
2. Confirm the response is HTML and has the expected status.
3. Reload each route after hydration and confirm the same workspace remains.
4. Confirm unauthenticated access to protected routes redirects to `/login`.
5. Confirm authenticated users are redirected away from guest-only routes.
6. Confirm an unknown URL returns HTTP 404 and renders the branded not-found
   view after hydration.
7. Confirm `/cabinets` and `/cabinets/:id` preserve their legacy redirect.

## SEO and prerender verification

Run `npm run build && npm run check:seo` to verify the static route artifacts,
JS/CSS and image budgets, and the provider prerender contract. To validate
crawler-visible HTML from a deployment, run
`SEO_BASE_URL=https://staging.example.com npm run check:seo`; the command checks
title, description, canonical, robots and Open Graph tags for every public and
configured provider URL. Lighthouse remains an external evidence gate and is
run against the production URL with the release browser profile.

## Runtime boundary

| Command | Purpose | Release status |
| --- | --- | --- |
| `npm run dev` | Next.js development shell | supported |
| `npm run build` | Next.js production build | required |
| `npm run start` | Next.js production server | required |
| `npm run dev:vite` | compatibility/PWA development only | non-production |
| `npm run build:vite` | PWA preview bundle only | non-production |
| `npm run preview` | Vite PWA preview only | non-production |

Vite dependencies are intentionally retained because the PWA service-worker
build and Vitest configuration still use them. They are not used by the
production web deployment in `render.yaml`.
