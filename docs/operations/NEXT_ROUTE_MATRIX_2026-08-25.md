# Next.js route matrix

Updated: 2026-08-25

The production web process is `next start`. The existing feature tree is still
rendered inside the App Router catch-all shell through React Router; Vite is
kept only for the PWA preview and Vitest compatibility workflow. The server
allow-list lives in `src/app/next/next-route-contract.ts` and prevents unknown
paths from returning a false HTTP 200.

## Route groups

| Group | Direct URL examples | Server response | Client guard |
| --- | --- | --- | --- |
| Public | `/`, `/services`, `/reviews`, `/for-owners`, `/help`, `/privacy` | 200 | none |
| Public dynamic | `/services/:providerId`, `/services/:providerId/request` | 200 | client booking guard where required |
| Legacy public redirects | `/cabinets`, `/cabinets/:id` | 200 | React Router redirect to discovery |
| Guest auth | `/login`, `/register`, `/forgot-password`, `/password/reset` | 200 | `RequireGuest` redirects authenticated users |
| Authenticated client | `/profile`, `/profile/vehicles`, `/profile/bookings`, `/profile/reviews`, `/notifications` | 200 | `RequireAuth` redirects to `/login` |
| Owner workspace | `/owner/dashboard`, `/owner/services`, `/owner/autocare-requests`, `/owner/clients` | 200 | owner role and workspace access |
| Owner dynamic | `/owner/autocare-providers/:id`, `/owner/autocare-providers/:id/reviews`, `/owner/cabinets/:id/edit` | 200 | owner membership/branch scope |
| Admin workspace | `/admin/dashboard`, `/admin/users`, `/admin/reviews`, `/admin/security-center` | 200 | admin or super-admin role |
| Super-admin workspace | `/super-admin/dashboard` | 200 | super-admin role |
| Hidden MVP chat routes | `/chats`, `/owner/chats`, `/admin/chats`, `/super-admin/chats` | 200 | feature flag keeps navigation hidden |
| Unknown | any path outside the contract | 404 | Next `not-found` boundary |

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
