import test from 'node:test'
import assert from 'node:assert/strict'

import {
    buildRouteSnapshot,
    collectRoutes,
    compareRouteSnapshots,
    formatRouteSnapshot,
} from './check-route-snapshot.mjs'

test('route collection is sorted, deduplicated, and does not include payload data', () => {
    const routes = collectRoutes("http.get('/api/v1/providers'); http.get('/api/v1/providers');", /http\.(get)\s*\(\s*['"]\/api([^'"]+)['"]/g)
    assert.deepEqual(routes, ['get:/v1/providers'])
})

test('route snapshot comparison reports drift by section', () => {
    const snapshot = buildRouteSnapshot({ mockSource: "http.get('/api/v1/providers')", backendSource: "app.get('/v1/providers', handler)" })
    assert.equal(snapshot.mockRoutes[0], 'get:/v1/providers')
    assert.equal(snapshot.backendRoutes[0], 'get:/v1/providers')
    assert.match(formatRouteSnapshot(snapshot), /mock=1, backend=1/)
    assert.equal(compareRouteSnapshots(snapshot, snapshot).matches, true)
    const drifted = { ...snapshot, backendRoutes: ['get:/v1/other'] }
    assert.deepEqual(compareRouteSnapshots(snapshot, drifted), { matches: false, differences: ['backendRoutes'] })
})
