import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { buildApp } from '../app'

describe('Health Route Integration', () => {
  it('returns readiness checks and propagates a safe request ID', async () => {
    const app = await buildApp()
    await app.ready()
    
    const response = await request(app.server)
      .get('/health')
      .set('X-Request-Id', 'health-check-123')
    
    expect([200, 503]).toContain(response.status)
    expect(response.body).toEqual(expect.objectContaining({
      status: response.status === 200 ? 'ok' : 'degraded',
      service: 'autocare-hub-api',
      database: 'connected',
    }))
    expect(response.body.checks.database.status).toBe('ok')
    expect(response.body.checks.outbox.status).toBe('ok')
    expect(response.body.checks.outbox.deadLetter).toBeGreaterThanOrEqual(0)
    expect(response.body.checks.storage.status).toBe('ok')
    expect(['ok', 'skipped']).toContain(response.body.checks.redis.status)
    expect(response.headers['x-request-id']).toBe('health-check-123')
    
    await app.close()
  })

  it('keeps liveness independent from dependency availability', async () => {
    const app = await buildApp()
    await app.ready()

    const response = await request(app.server).get('/health/live')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      status: 'ok',
      service: 'autocare-hub-api',
    })

    await app.close()
  })
})
