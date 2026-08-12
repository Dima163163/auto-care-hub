import { describe, expect, it } from 'vitest'

import { OperationTimeoutError, withTimeout } from './with-timeout.js'

describe('bounded async operation timeout', () => {
    it('returns a completed operation before the deadline', async () => {
        await expect(withTimeout('quick-task', async () => 'done', 50)).resolves.toBe('done')
    })

    it('rejects stalled work with an identifiable timeout error', async () => {
        await expect(withTimeout('slow-task', () => new Promise<string>(() => undefined), 1))
            .rejects.toBeInstanceOf(OperationTimeoutError)
    })
})
