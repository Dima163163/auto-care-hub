import 'reflect-metadata'
import { beforeAll, beforeEach, afterAll } from 'vitest'
import { resolveIntegrationTargets } from './integration-target-policy.js'

// Validate before importing modules that capture dotenv/database/Redis config.
const targets = resolveIntegrationTargets(process.env)
process.env.DATABASE_URL = targets.databaseUrl
process.env.REDIS_URL = targets.redisUrl

const { AppDataSource } = await import('../database/data-source.js')
const { disconnectRedis } = await import('../shared/redis/redis.js')
const { clearRateLimitState } = await import('./rate-limit-cleanup.js')

beforeAll(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize()
  }
})

beforeEach(async () => {
  await clearRateLimitState()
})

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy()
  }
  await disconnectRedis()
})
