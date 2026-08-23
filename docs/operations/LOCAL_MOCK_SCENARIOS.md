# Local mock UI scenarios

The mock API can exercise the same states that the production UI must handle without changing application code. In browser devtools run:

```js
localStorage.setItem('autocare-mock-state', 'offline')
location.reload()
```

Supported values are `default`, `empty`, `error`, `stale`, `offline`, `permission-denied` and `suspended`. Clear the override with `localStorage.removeItem('autocare-mock-state')` and reload.

The value is sent only when the app uses MSW (`IS_REAL_API=false`) as `X-AutoCare-Mock-State`; the real server ignores this client-only switch. `empty` returns empty collections for handlers that opt into it. Other states use the API error shape (`403` permission denied, `423` suspended, `503` offline/error/stale) so retry, stale-data and offline UI paths can be verified.
