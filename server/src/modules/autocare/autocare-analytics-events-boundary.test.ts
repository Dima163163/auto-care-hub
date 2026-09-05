import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    query: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import { recordAutoCareProviderDiscoveryImpressions, recordAutoCareProviderProfileOpen } from './autocare-analytics.service.js'

const providerId = '11111111-1111-4111-8111-111111111111'

describe('public analytics event input boundary', () => {
    beforeEach(() => mocks.query.mockReset())

    it('ignores malformed profile-open provider ids before SQL', async () => {
        await recordAutoCareProviderProfileOpen('provider-1')
        expect(mocks.query).not.toHaveBeenCalled()
    })

    it('canonicalizes and deduplicates discovery provider ids before SQL', async () => {
        mocks.query.mockResolvedValue(undefined)

        await recordAutoCareProviderDiscoveryImpressions([` ${providerId.toUpperCase()} `, providerId, 'provider-1'])

        expect(mocks.query).toHaveBeenCalledTimes(1)
        expect(mocks.query.mock.calls[0]?.[1]).toEqual(expect.arrayContaining([providerId, 2]))
    })

    it('ignores empty or oversized impression batches without SQL', async () => {
        await recordAutoCareProviderDiscoveryImpressions([])
        await recordAutoCareProviderDiscoveryImpressions(Array.from({ length: 101 }, () => providerId))
        expect(mocks.query).not.toHaveBeenCalled()
    })

    it('records a canonical profile-open provider id', async () => {
        mocks.query.mockResolvedValue(undefined)

        await recordAutoCareProviderProfileOpen(` ${providerId.toUpperCase()} `)

        expect(mocks.query).toHaveBeenCalledTimes(1)
        expect(mocks.query.mock.calls[0]?.[1]).toEqual(expect.arrayContaining([providerId, 1]))
    })
})
