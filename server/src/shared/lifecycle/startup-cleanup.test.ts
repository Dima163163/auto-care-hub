import type { FastifyInstance } from 'fastify'
import { describe, expect, it, vi } from 'vitest'

import { cleanupStartupResources } from './startup-cleanup.js'

describe('startup resource cleanup', () => {
    it('closes jobs, app, and database in order', async () => {
        const events: string[] = []
        const app = {
            close: vi.fn(async () => {
                events.push('app')
            }),
        } as unknown as FastifyInstance

        const errors = await cleanupStartupResources({
            app,
            stopBackgroundJobs: async () => {
                events.push('jobs')
            },
            disconnectDatabase: async () => {
                events.push('database')
            },
        })

        expect(errors).toEqual([])
        expect(events).toEqual(['jobs', 'app', 'database'])
    })

    it('continues cleanup when one resource fails', async () => {
        const close = vi.fn().mockResolvedValue(undefined)
        const disconnectDatabase = vi.fn().mockRejectedValue(new Error('db close failed'))

        const errors = await cleanupStartupResources({
            app: { close } as unknown as FastifyInstance,
            stopBackgroundJobs: vi.fn().mockRejectedValue(new Error('jobs close failed')),
            disconnectDatabase,
        })

        expect(close).toHaveBeenCalledOnce()
        expect(disconnectDatabase).toHaveBeenCalledOnce()
        expect(errors).toHaveLength(2)
    })
})
