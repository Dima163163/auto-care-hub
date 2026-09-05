import test from 'node:test'
import assert from 'node:assert/strict'

import { findDuplicateRoutePaths, parseNextRouteEntries } from './check-next-route-inventory.mjs'

test('parses canonical route constants in source order', () => {
    assert.deepEqual(parseNextRouteEntries("export const routes = {\n  home: '/',\n  services: '/services',\n}"), [
        { name: 'home', path: '/' },
        { name: 'services', path: '/services' },
    ])
})

test('detects duplicate route paths before they reach runtime', () => {
    const entries = parseNextRouteEntries("const routes = {\n  home: '/',\n  landing: '/',\n}")
    assert.deepEqual(findDuplicateRoutePaths(entries), [{ path: '/', names: ['home', 'landing'] }])
})

test('returns no duplicate paths for a unique route inventory', () => {
    assert.deepEqual(findDuplicateRoutePaths([
        { name: 'home', path: '/' },
        { name: 'services', path: '/services' },
    ]), [])
})
