import { describe, expect, it } from 'vitest'

import { AutoCareChatReportStatus } from '../../entities/automotive/chat-moderation.entity.js'
import { normalizeAutoCareChatBlockInput, normalizeAutoCareChatReportDecision, normalizeAutoCareChatReportInput, normalizeAutoCareChatReportStatus, normalizeAutoCareChatReportUuid } from './chat-moderation-policy.js'

describe('AutoCare chat moderation input policy', () => {
    it('normalizes report category and description', () => {
        expect(normalizeAutoCareChatReportInput({ category: ' SPAM ', description: '  Repeated messages  ' })).toEqual({ category: 'spam', description: 'Repeated messages' })
        expect(normalizeAutoCareChatReportInput({ category: 'other', description: '   ' })).toEqual({ category: 'other', description: null })
    })

    it('rejects malformed reports and oversized descriptions', () => {
        expect(normalizeAutoCareChatReportInput({ category: 'unknown', description: 'valid' })).toBeNull()
        expect(normalizeAutoCareChatReportInput({ category: 'spam', description: 'x'.repeat(2_001) })).toBeNull()
        expect(normalizeAutoCareChatReportInput({ category: 'spam', description: 42 })).toBeNull()
        expect(normalizeAutoCareChatReportInput({ category: 'spam', description: 'valid', metadata: true })).toBeNull()
    })

    it('normalizes block target and reason before persistence', () => {
        expect(normalizeAutoCareChatBlockInput('  11111111-1111-4111-8111-111111111111  ', '  Please stop.  ')).toEqual({ blockedUserId: '11111111-1111-4111-8111-111111111111', reason: 'Please stop.' })
        expect(normalizeAutoCareChatBlockInput(undefined, null)).toEqual({ blockedUserId: null, reason: null })
        expect(normalizeAutoCareChatBlockInput('not-a-uuid', 'reason')).toBeNull()
        expect(normalizeAutoCareChatBlockInput(undefined, 'x'.repeat(1_001))).toBeNull()
    })

    it('normalizes moderator decisions and defaults blockUser', () => {
        expect(normalizeAutoCareChatReportDecision(' RESOLVED ', '  Reviewed  ', undefined)).toEqual({ status: AutoCareChatReportStatus.Resolved, reason: 'Reviewed', blockUser: false })
        expect(normalizeAutoCareChatReportDecision(AutoCareChatReportStatus.Dismissed, null, true)).toEqual({ status: AutoCareChatReportStatus.Dismissed, reason: null, blockUser: true })
    })

    it('rejects invalid decision status, reason and block flag', () => {
        expect(normalizeAutoCareChatReportDecision('pending', 'reason', false)).toBeNull()
        expect(normalizeAutoCareChatReportDecision(AutoCareChatReportStatus.Resolved, 'x'.repeat(2_001), false)).toBeNull()
        expect(normalizeAutoCareChatReportDecision(AutoCareChatReportStatus.Resolved, 'reason', 'yes')).toBeNull()
    })

    it('normalizes the admin report status filter and report identifier', () => {
        expect(normalizeAutoCareChatReportStatus('  PENDING ')).toBe(AutoCareChatReportStatus.Pending)
        expect(normalizeAutoCareChatReportStatus('resolved')).toBe(AutoCareChatReportStatus.Resolved)
        expect(normalizeAutoCareChatReportStatus('unknown')).toBeNull()
        expect(normalizeAutoCareChatReportStatus(null)).toBeNull()
        expect(normalizeAutoCareChatReportUuid('  11111111-1111-4111-8111-111111111111  ')).toBe('11111111-1111-4111-8111-111111111111')
        expect(normalizeAutoCareChatReportUuid('not-a-uuid')).toBeNull()
    })
})
