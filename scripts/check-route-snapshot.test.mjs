import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readMockHandlerSources } from './mock-handler-sources.mjs'

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

test('modular mock contracts include registered handlers and detect their route drift', async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'mock-route-contract-'))
    t.after(() => rm(root, { recursive: true, force: true }))
    const directory = join(root, 'src/app/mocks/autocare')
    await mkdir(directory, { recursive: true })
    await writeFile(join(root, 'src/app/mocks/handlers.ts'), "import { requestsHandlers } from './autocare/requests.handlers'\nexport const handlers = [...requestsHandlers]\n")
    await writeFile(join(directory, 'requests.handlers.ts'), "http.get('/api/v1/service-requests/my')")
    await writeFile(join(directory, 'unused.handlers.ts'), "http.get('/api/unregistered')")
    const expected = buildRouteSnapshot({ mockSource: await readMockHandlerSources(root), backendSource: '' })
    assert.deepEqual(expected.mockRoutes, ['get:/v1/service-requests/my'])
    await writeFile(join(directory, 'requests.handlers.ts'), "http.get('/api/v1/service-requests/changed')")
    const actual = buildRouteSnapshot({ mockSource: await readMockHandlerSources(root), backendSource: '' })
    assert.deepEqual(compareRouteSnapshots(expected, actual).differences, ['mockRoutes'])
})
