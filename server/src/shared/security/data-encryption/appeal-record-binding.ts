import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireAppealRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TABLE = 'autocare_appeals'

export type AppealRecord = {
    id?: string
    subject?: string
    subjectId?: string
    submittedById?: string
    providerId?: string | null
    reason?: string
    reasonBinding?: string | null
    decisionReason?: string | null
    decisionReasonBinding?: string | null
}

export function appealContext(record: AppealRecord) {
    if (!record.subject || record.subject.length > 64
        || !record.subjectId || !UUID.test(record.subjectId)
        || !record.submittedById || !UUID.test(record.submittedById)
        || (record.providerId !== null && record.providerId !== undefined && !UUID.test(record.providerId))) {
        throw new Error('Encrypted appeal owner scope is invalid.')
    }
    return JSON.stringify([record.subject, record.subjectId.toLowerCase(), record.submittedById.toLowerCase(),
        record.providerId?.toLowerCase() ?? null])
}

export function sealAppealFields(record: AppealRecord) {
    if (record.reason === undefined && record.decisionReason === undefined) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted appeal record ID is missing.')
    const context = appealContext(record)
    if (record.reason !== undefined) {
        record.reasonBinding = createPlaintextRecordBinding(TABLE, 'reason', record.reason, record.id, context)
    }
    if (record.decisionReason !== undefined) {
        record.decisionReasonBinding = record.decisionReason === null ? null
            : createPlaintextRecordBinding(TABLE, 'decisionReason', record.decisionReason, record.id, context)
    }
}

export function openAppealFields(record: AppealRecord) {
    if (record.reason === undefined && record.decisionReason === undefined) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted appeal record ID is missing.')
    const context = appealContext(record)
    const allowLegacy = !requireAppealRecordBinding()
    if (record.reason !== undefined) {
        verifyPlaintextRecordBinding(TABLE, 'reason', record.reason, record.id, record.reasonBinding,
            { allowLegacy, context })
    }
    if (record.decisionReason !== undefined) {
        if (record.decisionReason === null) {
            if (record.decisionReasonBinding !== null && record.decisionReasonBinding !== undefined) {
                throw new Error('Encrypted appeal decision reason binding is invalid.')
            }
        } else {
            verifyPlaintextRecordBinding(TABLE, 'decisionReason', record.decisionReason,
                record.id, record.decisionReasonBinding, { allowLegacy, context })
        }
    }
}
