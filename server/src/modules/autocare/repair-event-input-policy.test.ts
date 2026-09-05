import { describe, expect, it } from 'vitest'

import { normalizeAutoCareRepairEventInput } from './repair-event-input-policy.js'

const requestId = '11111111-1111-4111-8111-111111111111'
const actorId = '22222222-2222-4222-8222-222222222222'

describe('AutoCare repair event input policy', () => {
    it('canonicalizes identifiers, event text and scalar metadata', () => {
        expect(normalizeAutoCareRepairEventInput({
            requestId: ` ${requestId.toUpperCase()} `,
            actorId: ` ${actorId.toUpperCase()} `,
            eventType: '  RESCHEDULE_REQUESTED  ',
            title: '  Новое время визита  ',
            notes: '  Клиенту отправлено предложение  ',
            metadata: { proposedAt: '  2026-09-04T10:30:00.000Z  ', attempt: 1, accepted: false },
        })).toEqual({
            requestId,
            actorId,
            eventType: 'reschedule_requested',
            title: 'Новое время визита',
            notes: 'Клиенту отправлено предложение',
            metadata: { proposedAt: '2026-09-04T10:30:00.000Z', attempt: 1, accepted: false },
        })
    })

    it('normalizes omitted and nullable fields to stable defaults', () => {
        expect(normalizeAutoCareRepairEventInput({ requestId, eventType: 'completed', title: 'Визит завершён' })).toEqual({
            requestId,
            actorId: null,
            eventType: 'completed',
            title: 'Визит завершён',
            notes: null,
            metadata: {},
        })
        expect(normalizeAutoCareRepairEventInput({ requestId, actorId: null, eventType: 'completed', title: 'Визит завершён', notes: null, metadata: null })).toMatchObject({ actorId: null, notes: null, metadata: {} })
    })

    it('accepts bounded scalar arrays but rejects nested metadata', () => {
        expect(normalizeAutoCareRepairEventInput({ requestId, eventType: 'completed', title: 'Визит завершён', metadata: { tags: ['done', 1, null, true] } })?.metadata).toEqual({ tags: ['done', 1, null, true] })
        expect(normalizeAutoCareRepairEventInput({ requestId, eventType: 'completed', title: 'Визит завершён', metadata: { nested: { status: 'done' } } })).toBeNull()
        expect(normalizeAutoCareRepairEventInput({ requestId, eventType: 'completed', title: 'Визит завершён', metadata: { value: Number.NaN } })).toBeNull()
    })

    it('rejects malformed identifiers, event names, text and unknown fields', () => {
        expect(normalizeAutoCareRepairEventInput({ requestId: 'request-1', eventType: 'completed', title: 'Визит завершён' })).toBeNull()
        expect(normalizeAutoCareRepairEventInput({ requestId, actorId: 'actor-1', eventType: 'completed', title: 'Визит завершён' })).toBeNull()
        expect(normalizeAutoCareRepairEventInput({ requestId, eventType: 'not valid', title: 'Визит завершён' })).toBeNull()
        expect(normalizeAutoCareRepairEventInput({ requestId, eventType: 'completed', title: ' ', extra: true })).toBeNull()
    })

    it('bounds metadata collections and text lengths', () => {
        expect(normalizeAutoCareRepairEventInput({ requestId, eventType: 'completed', title: 'Визит завершён', notes: 'x'.repeat(4_001) })).toBeNull()
        expect(normalizeAutoCareRepairEventInput({ requestId, eventType: 'completed', title: 'Визит завершён', metadata: Object.fromEntries(Array.from({ length: 33 }, (_, index) => [`field-${index}`, index])) })).toBeNull()
        expect(normalizeAutoCareRepairEventInput({ requestId, eventType: 'completed', title: 'Визит завершён', metadata: { note: 'x'.repeat(513) } })).toBeNull()
    })
})
