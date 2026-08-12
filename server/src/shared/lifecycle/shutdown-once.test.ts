import { describe, expect, it, vi } from 'vitest'

import { createShutdownOnceHandler } from './shutdown-once.js'

describe('shutdown once handler', () => {
    it('shares one in-flight shutdown promise across signals', async () => {
        let resolveHandler!: () => void
        const handler = vi.fn(() => new Promise<void>((resolve) => {
            resolveHandler = resolve
        }))
        const shutdown = createShutdownOnceHandler(handler)

        const first = shutdown('SIGTERM')
        const second = shutdown('SIGINT')

        expect(second).toBe(first)
        expect(handler).toHaveBeenCalledTimes(1)
        expect(handler).toHaveBeenCalledWith('SIGTERM')

        resolveHandler()
        await first
    })
})
