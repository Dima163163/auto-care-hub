import test from 'node:test'
import assert from 'node:assert/strict'

import { evaluateOwnerRouteAuth, formatOwnerRouteAuthResults, loadOwnerRouteSource } from './check-owner-route-auth.mjs'

test('all AutoCare owner routes have an authenticated request boundary', () => {
  const results = evaluateOwnerRouteAuth(loadOwnerRouteSource())
  assert.ok(results.length >= 20)
  assert.equal(results.filter((result) => result.status === 'blocked').length, 0)
})

test('owner mutation without verified email is blocked', () => {
  const results = evaluateOwnerRouteAuth([
    "app.get('/owner/safe', async (request) => requireAuth(request))",
    "app.post('/owner/unsafe', async (request) => createSomething(request))",
  ].join('\n'))
  assert.deepEqual(results.map((result) => result.status), ['pass', 'blocked'])
  assert.match(formatOwnerRouteAuthResults(results), /POST \/owner\/unsafe.*verified/i)
})

test('non-owner routes are ignored by the owner contract', () => {
  const results = evaluateOwnerRouteAuth("app.post('/v1/service-requests', async (request) => createSomething(request))")
  assert.deepEqual(results, [])
})
