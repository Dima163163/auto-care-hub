import test from 'node:test'
import assert from 'node:assert/strict'

import {
  evaluateAdminRouteAuth,
  evaluateOwnerRouteAuth,
  evaluateRouteAuth,
  formatOwnerRouteAuthResults,
  loadAdminRouteSource,
  loadOwnerRouteSource,
} from './check-owner-route-auth.mjs'

test('all AutoCare owner routes have an authenticated request boundary', () => {
  const results = evaluateOwnerRouteAuth(loadOwnerRouteSource())
  assert.ok(results.length >= 20)
  assert.equal(results.filter((result) => result.status === 'blocked').length, 0)
})

test('all admin routes authenticate before validating request input', () => {
  const results = evaluateAdminRouteAuth(loadAdminRouteSource())
  assert.ok(results.length >= 10)
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

test('owner route that validates request input before authentication is blocked', () => {
  const results = evaluateOwnerRouteAuth([
    "app.post('/owner/unsafe-order', async (request) => { const params = validateParams(schema, request.params); return createSomething(await requireVerifiedEmail(request), params) })",
  ].join('\n'))
  assert.deepEqual(results.map((result) => result.status), ['blocked'])
  assert.match(formatOwnerRouteAuthResults(results), /POST \/owner\/unsafe-order.*authenticate before validating/i)
})

test('non-owner routes are ignored by the owner contract', () => {
  const results = evaluateOwnerRouteAuth("app.post('/v1/service-requests', async (request) => createSomething(request))")
  assert.deepEqual(results, [])
})

test('generic route contract supports protected prefixes', () => {
  const results = evaluateRouteAuth([
    "app.get('/admin/safe', async (request) => { const user = await requireAuth(request); return validateQuery(schema, request.query) })",
    "app.patch('/admin/unsafe-order', async (request) => { const body = validateBody(schema, request.body); return update(await requireAuth(request), body) })",
  ].join('\n'), { prefix: '/admin/' })
  assert.deepEqual(results.map((result) => result.status), ['pass', 'blocked'])
  assert.match(formatOwnerRouteAuthResults(results), /PATCH \/admin\/unsafe-order.*authenticate before validating/i)
})
