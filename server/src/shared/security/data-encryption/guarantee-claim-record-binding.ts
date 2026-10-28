import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireGuaranteeClaimRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TABLE = 'autocare_guarantee_claims'
export const GUARANTEE_CLAIM_FIELDS = [
    { value: 'summary', binding: 'summaryBinding' },
    { value: 'resolution', binding: 'resolutionBinding' },
] as const
export type GuaranteeClaimValue = typeof GUARANTEE_CLAIM_FIELDS[number]['value']
export type GuaranteeClaimBinding = typeof GUARANTEE_CLAIM_FIELDS[number]['binding']
export type GuaranteeClaimRecord = {
    id?: string
    requestId?: string
    clientId?: string
    providerId?: string
    claimType?: string
} & Partial<Record<GuaranteeClaimValue | GuaranteeClaimBinding, unknown>>

export function guaranteeClaimContext(record: GuaranteeClaimRecord) {
    if (!record.requestId || !UUID.test(record.requestId)
        || !record.clientId || !UUID.test(record.clientId)
        || !record.providerId || !UUID.test(record.providerId)
        || !record.claimType || record.claimType.length > 128) {
        throw new Error('Encrypted guarantee claim scope is invalid.')
    }
    return JSON.stringify([record.requestId.toLowerCase(), record.clientId.toLowerCase(),
        record.providerId.toLowerCase(), record.claimType])
}

export function sealGuaranteeClaimFields(record: GuaranteeClaimRecord) {
    if (!GUARANTEE_CLAIM_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted guarantee claim record ID is missing.')
    const context = guaranteeClaimContext(record)
    for (const { value, binding } of GUARANTEE_CLAIM_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        if (plaintext !== null && typeof plaintext !== 'string') throw new Error(`Encrypted guarantee claim ${value} is invalid.`)
        record[binding] = plaintext === null ? null
            : createPlaintextRecordBinding(TABLE, value, plaintext as string, record.id, context)
    }
}

export function openGuaranteeClaimFields(record: GuaranteeClaimRecord) {
    if (!GUARANTEE_CLAIM_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted guarantee claim record ID is missing.')
    const context = guaranteeClaimContext(record)
    const allowLegacy = !requireGuaranteeClaimRecordBinding()
    for (const { value, binding } of GUARANTEE_CLAIM_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        if (plaintext === null) {
            if (value !== 'resolution' || (record[binding] !== null && record[binding] !== undefined)) {
                throw new Error(`Encrypted guarantee claim ${value} binding is invalid.`)
            }
            continue
        }
        if (typeof plaintext !== 'string') throw new Error(`Encrypted guarantee claim ${value} is invalid.`)
        verifyPlaintextRecordBinding(TABLE, value, plaintext, record.id, record[binding] as string | null | undefined,
            { allowLegacy, context })
    }
}
