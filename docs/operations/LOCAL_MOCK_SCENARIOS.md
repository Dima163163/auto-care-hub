# Local mock UI scenarios

The mock API can exercise the same states that the production UI must handle without changing application code. In browser devtools run:

```js
localStorage.setItem('autocare-mock-state', 'offline')
location.reload()
```

Supported values are `default`, `empty`, `error`, `stale`, `offline`, `permission-denied`, `suspended`, `partial` and `expired-session`. Clear the override with `localStorage.removeItem('autocare-mock-state')` and reload.

The value is sent only when the app uses MSW (`IS_REAL_API=false`) as `X-AutoCare-Mock-State`; the real server ignores this client-only switch. `empty` returns empty collections for handlers that opt into it. `partial` returns a bounded discovery response with an explicit `partial: true` marker so available results stay visible while the UI shows a non-blocking warning. `expired-session` returns a `401 SESSION_EXPIRED` response for `/auth/me`. Other states use the API error shape (`403` permission denied, `423` suspended, `503` offline/error/stale) so retry, stale-data and offline UI paths can be verified.

## Provider team accounts

For mock mode, the password may be any non-empty value. The team scenario uses
one provider-wide owner and a staff member restricted to one branch:

| Account | Email | Scope |
| --- | --- | --- |
| ProService owner | `sophia.miller@example.com` | All ProService and AutoLux branches |
| ProService staff | `ilya.orlov@proservice.test` | ProService, Moscow branch only |

For the local PostgreSQL seed, use `staff.demo@autocarehub.test` with password
`123456`. It has the same Staff membership on the seeded ProService location.
