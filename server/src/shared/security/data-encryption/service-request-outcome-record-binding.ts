import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireServiceRequestOutcomeRecordBinding } from './record-binding-policy.js'
import { serviceRequestRecordContext, type ServiceRequestRecordScope } from './service-request-record-scope.js'

export const SERVICE_REQUEST_OUTCOME_FIELDS = [
    { value: 'cancellationReason', binding: 'cancellationReasonBinding' },
    { value: 'noShowReason', binding: 'noShowReasonBinding' },
    { value: 'completionNote', binding: 'completionNoteBinding' },
] as const

export type ServiceRequestOutcomeField = typeof SERVICE_REQUEST_OUTCOME_FIELDS[number]
export type ServiceRequestOutcomeValue = ServiceRequestOutcomeField['value']
export type ServiceRequestOutcomeBinding = ServiceRequestOutcomeField['binding']
export type ServiceRequestOutcomeRecord = ServiceRequestRecordScope & { id?: string }
    & Partial<Record<ServiceRequestOutcomeValue | ServiceRequestOutcomeBinding, string | null>>

export function sealServiceRequestOutcomeFields(record: ServiceRequestOutcomeRecord) {
    if (!SERVICE_REQUEST_OUTCOME_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (typeof record.id !== 'string') throw new Error('Encrypted service request outcome record scope is invalid.')
    const context = serviceRequestRecordContext(record)
    for (const { value, binding } of SERVICE_REQUEST_OUTCOME_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        record[binding] = plaintext === null ? null
            : createPlaintextRecordBinding('autocare_service_requests', value, plaintext, record.id, context)
    }
}

export function openServiceRequestOutcomeFields(record: ServiceRequestOutcomeRecord) {
    if (!SERVICE_REQUEST_OUTCOME_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (typeof record.id !== 'string') throw new Error('Encrypted service request outcome record scope is invalid.')
    const context = serviceRequestRecordContext(record)
    const allowLegacy = !requireServiceRequestOutcomeRecordBinding()
    for (const { value, binding } of SERVICE_REQUEST_OUTCOME_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        if (plaintext === null) {
            if (record[binding] !== null && record[binding] !== undefined) {
                throw new Error(`Encrypted autocare_service_requests.${value} record binding is invalid.`)
            }
            continue
        }
        verifyPlaintextRecordBinding('autocare_service_requests', value, plaintext, record.id,
            record[binding], { allowLegacy, context })
    }
}
