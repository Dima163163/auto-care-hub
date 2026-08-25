import { describe, expect, it } from 'vitest'

import { isRolloutEnabled } from './rollout-controls.js'

describe('rollout controls', () => {
    const context = { marketId: 'market-samara', subjectKey: 'user-42' }

    it('keeps disabled features off and limits by market', () => {
        expect(isRolloutEnabled({ enabled: false }, context)).toBe(false)
        expect(isRolloutEnabled({ enabled: true, marketIds: ['market-moscow'] }, context)).toBe(false)
        expect(isRolloutEnabled({ enabled: true, marketIds: ['market-samara'] }, context)).toBe(true)
    })

    it('uses a stable subject hash for percentage rollout', () => {
        const rule = { enabled: true, percentage: 50 }
        expect(isRolloutEnabled(rule, context)).toBe(isRolloutEnabled(rule, context))
        expect(isRolloutEnabled({ ...rule, percentage: 0 }, context)).toBe(false)
        expect(isRolloutEnabled({ ...rule, percentage: 100 }, context)).toBe(true)
    })
})
