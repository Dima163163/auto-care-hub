import { describe, expect, it, vi } from 'vitest'

import { AddStripeWebhookUnmatchedStatus1785480000000 } from './migrations/1785480000000-AddStripeWebhookUnmatchedStatus.js'

describe('Stripe webhook unmatched status migration', () => {
    it('adds a retryable unmatched status without rewriting existing events', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AddStripeWebhookUnmatchedStatus1785480000000().up({ query } as never)

        expect(query).toHaveBeenCalledWith(expect.stringContaining("ADD VALUE IF NOT EXISTS 'unmatched'"))
        expect(query.mock.calls[0]?.[0]).not.toContain('DELETE FROM')
    })
})
