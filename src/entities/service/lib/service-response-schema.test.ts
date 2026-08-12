import { describe, expect, it } from 'vitest'

import {
    normalizeDeleteServiceResponse,
    normalizeServiceListResponse,
    normalizeServiceResponse,
} from './service-response-schema'

const service = {
    id: 'service-1',
    cabinetId: 'cabinet-1',
    title: 'Portrait session',
    description: null,
    durationMinutes: 60,
    price: 2_500,
    isActive: true,
}

describe('service response schemas', () => {
    it('normalizes service lists and mutations', () => {
        expect(normalizeServiceListResponse([service])).toHaveLength(1)
        expect(normalizeServiceResponse(service).price).toBe(2_500)
        expect(normalizeDeleteServiceResponse({ success: true }).success).toBe(true)
    })

    it('rejects invalid duration and price values', () => {
        expect(() => normalizeServiceResponse({ ...service, durationMinutes: 0 })).toThrow()
        expect(() => normalizeServiceResponse({ ...service, price: 1.5 })).toThrow()
        expect(() => normalizeDeleteServiceResponse({ success: false })).toThrow()
    })
})
