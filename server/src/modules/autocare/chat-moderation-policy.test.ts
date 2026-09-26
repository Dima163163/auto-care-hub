import { describe, expect, it } from 'vitest'

import { AutoCareChatReportCategory, AutoCareChatReportStatus } from '../../entities/automotive/chat-moderation.entity.js'
import { calculateAutoCareChatExtendedExpiry, isAutoCareChatBlockEffective, normalizeAutoCareChatBlockInput, normalizeAutoCareChatModeratorAssignment, normalizeAutoCareChatModeratorExtension, normalizeAutoCareChatReportDecision, normalizeAutoCareChatReportInput, normalizeAutoCareChatReportStatus, normalizeAutoCareChatReportUuid, resolveAutoCareChatReportConflict } from './chat-moderation-policy.js'

describe('AutoCare chat moderation input policy', () => {
    it('normalizes report category and description', () => {
        expect(normalizeAutoCareChatReportInput({ messageId: '11111111-1111-4111-8111-111111111111', category: ' THREAT ', description: '  Threat details  ', acknowledgeFullThreadReview: true })).toEqual({ reportedMessageId: '11111111-1111-4111-8111-111111111111', category: 'threat', description: 'Threat details' })
        expect(normalizeAutoCareChatReportInput({ messageId: '11111111-1111-4111-8111-111111111111', category: 'other', description: '   ', acknowledgeFullThreadReview: true })).toEqual({ reportedMessageId: '11111111-1111-4111-8111-111111111111', category: 'other', description: null })
    })

    it('rejects malformed reports and oversized descriptions', () => {
        const messageId = '11111111-1111-4111-8111-111111111111'
        expect(normalizeAutoCareChatReportInput({ messageId, category: 'unknown', description: 'valid', acknowledgeFullThreadReview: true })).toBeNull()
        expect(normalizeAutoCareChatReportInput({ messageId, category: 'threat', description: 'x'.repeat(2_001), acknowledgeFullThreadReview: true })).toBeNull()
        expect(normalizeAutoCareChatReportInput({ messageId, category: 'threat', description: 42, acknowledgeFullThreadReview: true })).toBeNull()
        expect(normalizeAutoCareChatReportInput({ messageId, category: 'threat', description: 'valid', acknowledgeFullThreadReview: false })).toBeNull()
        expect(normalizeAutoCareChatReportInput({ messageId: 'bad', category: 'threat', description: 'valid', acknowledgeFullThreadReview: true })).toBeNull()
        expect(normalizeAutoCareChatReportInput({ messageId, category: 'threat', description: 'valid', acknowledgeFullThreadReview: true, metadata: true })).toBeNull()
    })

    it('normalizes block target and reason before persistence', () => {
        expect(normalizeAutoCareChatBlockInput('  11111111-1111-4111-8111-111111111111  ', '  Please stop.  ')).toEqual({ blockedUserId: '11111111-1111-4111-8111-111111111111', reason: 'Please stop.' })
        expect(normalizeAutoCareChatBlockInput(undefined, null)).toEqual({ blockedUserId: null, reason: null })
        expect(normalizeAutoCareChatBlockInput('not-a-uuid', 'reason')).toBeNull()
        expect(normalizeAutoCareChatBlockInput(undefined, 'x'.repeat(1_001))).toBeNull()
    })

    it('normalizes moderator decisions and defaults blockUser', () => {
        expect(normalizeAutoCareChatReportDecision(' RESOLVED ', '  Reviewed the evidence  ', undefined)).toEqual({ status: AutoCareChatReportStatus.Resolved, reason: 'Reviewed the evidence', blockUser: false, blockDurationDays: null })
        expect(normalizeAutoCareChatReportDecision(AutoCareChatReportStatus.Resolved, 'Confirmed policy violation', true)).toEqual({ status: AutoCareChatReportStatus.Resolved, reason: 'Confirmed policy violation', blockUser: true, blockDurationDays: 1 })
    })

    it('accepts only supported scoped restriction durations', () => {
        const reason = 'Confirmed policy violation'
        expect(normalizeAutoCareChatReportDecision(AutoCareChatReportStatus.Resolved, reason, true, 1)?.blockDurationDays).toBe(1)
        expect(normalizeAutoCareChatReportDecision(AutoCareChatReportStatus.Resolved, reason, true, 7)?.blockDurationDays).toBe(7)
        expect(normalizeAutoCareChatReportDecision(AutoCareChatReportStatus.Resolved, reason, true, 30)?.blockDurationDays).toBe(30)
        expect(normalizeAutoCareChatReportDecision(AutoCareChatReportStatus.Resolved, reason, true, 14)).toBeNull()
        expect(normalizeAutoCareChatReportDecision(AutoCareChatReportStatus.Resolved, reason, false, 7)).toBeNull()
    })

    it('requires a scoped moderator assignment and nontrivial reason for privileged access changes', () => {
        expect(normalizeAutoCareChatModeratorAssignment('11111111-1111-4111-8111-111111111111', 'Assign for case review')).toEqual({ moderatorId: '11111111-1111-4111-8111-111111111111', reason: 'Assign for case review' })
        expect(normalizeAutoCareChatModeratorAssignment(null, 'Close moderator access')).toEqual({ moderatorId: null, reason: 'Close moderator access' })
        expect(normalizeAutoCareChatModeratorAssignment('bad', 'Assign for case review')).toBeNull()
        expect(normalizeAutoCareChatModeratorAssignment(null, 'too short')).toBeNull()
        expect(normalizeAutoCareChatModeratorExtension('Extend after second-side review')).toEqual({ reason: 'Extend after second-side review' })
        expect(normalizeAutoCareChatModeratorExtension('short')).toBeNull()
    })

    it('adds a full 24 hours to the current expiry and rejects expired grants', () => {
        const now = new Date('2026-09-24T10:00:00.000Z')
        const currentExpiry = new Date('2026-09-24T22:00:00.000Z')
        expect(calculateAutoCareChatExtendedExpiry(currentExpiry, now)?.toISOString()).toBe('2026-09-25T22:00:00.000Z')
        expect(calculateAutoCareChatExtendedExpiry(new Date('2026-09-24T09:59:59.000Z'), now)).toBeNull()
    })

    it('stops enforcing a temporary chat restriction once it expires', () => {
        const now = new Date('2026-09-24T10:00:00.000Z')
        expect(isAutoCareChatBlockEffective(null, now)).toBe(true)
        expect(isAutoCareChatBlockEffective(undefined, now)).toBe(true)
        expect(isAutoCareChatBlockEffective(new Date('2026-09-24T10:00:01.000Z'), now)).toBe(true)
        expect(isAutoCareChatBlockEffective(new Date('2026-09-24T10:00:00.000Z'), now)).toBe(false)
        expect(isAutoCareChatBlockEffective(new Date('2026-09-24T09:59:59.000Z'), now)).toBe(false)
    })

    it('blocks later retaliatory reports symmetrically but links distinct urgent threats', () => {
        const openedAt = new Date('2026-09-24T10:00:00.000Z')
        const later = new Date('2026-09-24T10:05:00.000Z')
        const clientCase = { id: 'case-client', reporterId: 'client', reportedUserId: 'service', reporterSide: 'client' as const, reportedSide: 'provider' as const, reportedMessageId: 'message-service', createdAt: openedAt }
        const serviceCase = { id: 'case-service', reporterId: 'service', reportedUserId: 'client', reporterSide: 'provider' as const, reportedSide: 'client' as const, reportedMessageId: 'message-client', createdAt: openedAt }

        expect(resolveAutoCareChatReportConflict({ activeReports: [clientCase], reporterSide: 'provider', messageSenderSide: 'client', messageId: 'later-client-message', messageCreatedAt: later, category: AutoCareChatReportCategory.Harassment, description: null }))
            .toEqual({ blocked: true, relatedReportId: null })
        expect(resolveAutoCareChatReportConflict({ activeReports: [clientCase], reporterSide: 'provider', messageSenderSide: 'client', messageId: 'later-client-message', messageCreatedAt: later, category: AutoCareChatReportCategory.Threat, description: 'Specific threat context, with details.' }))
            .toEqual({ blocked: false, relatedReportId: 'case-client' })
        expect(resolveAutoCareChatReportConflict({ activeReports: [serviceCase], reporterSide: 'client', messageSenderSide: 'provider', messageId: 'later-service-message', messageCreatedAt: later, category: AutoCareChatReportCategory.Harassment, description: null }))
            .toEqual({ blocked: true, relatedReportId: null })
        expect(resolveAutoCareChatReportConflict({ activeReports: [serviceCase], reporterSide: 'client', messageSenderSide: 'provider', messageId: 'later-service-message', messageCreatedAt: later, category: AutoCareChatReportCategory.Threat, description: 'Specific threat context, with details.' }))
            .toEqual({ blocked: false, relatedReportId: 'case-service' })
        expect(resolveAutoCareChatReportConflict({ activeReports: [clientCase], reporterSide: 'provider', messageSenderSide: 'client', messageId: 'later-client-message', messageCreatedAt: later, category: AutoCareChatReportCategory.Threat, description: 'short' }))
            .toEqual({ blocked: true, relatedReportId: null })
    })

    it('rejects invalid decision status, reason and block flag', () => {
        expect(normalizeAutoCareChatReportDecision('pending', 'reason', false)).toBeNull()
        expect(normalizeAutoCareChatReportDecision(AutoCareChatReportStatus.Resolved, 'reason', false)).toBeNull()
        expect(normalizeAutoCareChatReportDecision(AutoCareChatReportStatus.Dismissed, 'A sufficiently long reason', true)).toBeNull()
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
