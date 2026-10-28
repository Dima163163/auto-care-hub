import { describe, expect, it } from 'vitest'
import { reportResponse } from './chat-moderation-response.js'

describe('chat report response privacy boundary', () => {
    it('omits internal text bindings even from the private response', () => {
        const report = {
            id: '00000000-0000-4000-8000-000000000001',
            threadId: '00000000-0000-4000-8000-000000000002',
            reporterId: '00000000-0000-4000-8000-000000000003',
            reportedMessageId: null, relatedReportId: null, reportedUserId: null,
            category: 'other', status: 'pending', reviewedById: null,
            description: 'Private text', descriptionBinding: 'internal-hmac',
            resolutionReason: null, resolutionReasonBinding: null,
            assignmentReason: null, assignmentReasonBinding: null,
            extensionReason: null, extensionReasonBinding: null,
            overturnedAt: null, assignedModeratorId: null, accessExpiresAt: null,
            extensionUsed: false, createdAt: new Date('2026-10-28T10:00:00.000Z'),
            reviewedAt: null, acknowledgedAt: null, policyVersion: null,
        }
        expect(JSON.stringify(reportResponse(report as never, true))).not.toContain('Binding')
    })
})
