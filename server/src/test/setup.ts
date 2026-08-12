import 'reflect-metadata'
import { beforeAll, beforeEach, afterAll } from 'vitest'
import { AppDataSource } from '../database/data-source.js'
import { disconnectRedis } from '../shared/redis/redis.js'
import { clearRateLimitState } from './rate-limit-cleanup.js'

beforeAll(async () => {
  // In real project, we would use a separate test database URL
  // For this pet project, we'll assume the developer has a test DB or we use the same one but with care
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
