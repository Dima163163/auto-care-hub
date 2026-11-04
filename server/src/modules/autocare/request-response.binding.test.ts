import { describe, expect, it } from 'vitest'
import { rescheduleResponse } from './request-response.js'

describe('reschedule response privacy boundary', () => {
    it('omits internal reason bindings', () => {
        const request = {
            id: '00000000-0000-4000-8000-000000000001',
            requestId: '00000000-0000-4000-8000-000000000002',
            requestedById: '00000000-0000-4000-8000-000000000003',
            resolvedById: null,
            proposedAt: new Date('2026-10-30T10:00:00.000Z'),
            status: 'pending',
            reason: 'New slot',
            reasonBinding: 'internal-hmac',
            resolutionReason: null,
            resolutionReasonBinding: null,
            createdAt: new Date('2026-10-28T10:00:00.000Z'),
            resolvedAt: null,
        }
        expect(JSON.stringify(rescheduleResponse(request as never))).not.toContain('Binding')
    })
})
