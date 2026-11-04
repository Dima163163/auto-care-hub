import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireExpertQuestionRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TABLE = 'autocare_expert_questions'
export const EXPERT_QUESTION_FIELDS = [
    { value: 'vehicleSnapshot', binding: 'vehicleSnapshotBinding' },
    { value: 'symptoms', binding: 'symptomsBinding' },
    { value: 'answer', binding: 'answerBinding' },
] as const
export type ExpertQuestionValue = typeof EXPERT_QUESTION_FIELDS[number]['value']
export type ExpertQuestionBinding = typeof EXPERT_QUESTION_FIELDS[number]['binding']
export type ExpertQuestionRecord = {
    id?: string
    clientId?: string
} & Partial<Record<ExpertQuestionValue | ExpertQuestionBinding, unknown>>

export function expertQuestionContext(record: ExpertQuestionRecord) {
    if (!record.clientId || !UUID.test(record.clientId)) throw new Error('Encrypted expert question owner is invalid.')
    return record.clientId.toLowerCase()
}

export function serializeExpertQuestionField(field: ExpertQuestionValue, value: unknown): string {
    if (field === 'vehicleSnapshot') {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Encrypted expert vehicle snapshot is invalid.')
        return JSON.stringify(value)
    }
    if (typeof value !== 'string') throw new Error(`Encrypted expert question ${field} is invalid.`)
    return value
}

export function sealExpertQuestionFields(record: ExpertQuestionRecord) {
    if (!EXPERT_QUESTION_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted expert question record ID is missing.')
    const context = expertQuestionContext(record)
    for (const { value, binding } of EXPERT_QUESTION_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        record[binding] = plaintext === null ? null
            : createPlaintextRecordBinding(TABLE, value, serializeExpertQuestionField(value, plaintext), record.id, context)
    }
}

export function openExpertQuestionFields(record: ExpertQuestionRecord) {
    if (!EXPERT_QUESTION_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted expert question record ID is missing.')
    const context = expertQuestionContext(record)
    const allowLegacy = !requireExpertQuestionRecordBinding()
    for (const { value, binding } of EXPERT_QUESTION_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        if (plaintext === null) {
            if (value === 'symptoms' || (record[binding] !== null && record[binding] !== undefined)) {
                throw new Error(`Encrypted expert question ${value} binding is invalid.`)
            }
            continue
        }
        verifyPlaintextRecordBinding(TABLE, value, serializeExpertQuestionField(value, plaintext), record.id,
            record[binding] as string | null | undefined, { allowLegacy, context })
    }
}
