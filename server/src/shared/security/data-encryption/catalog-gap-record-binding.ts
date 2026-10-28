import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireCatalogGapRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TABLE = 'autocare_catalog_gap_requests'
export const CATALOG_GAP_FIELDS = [
    { value: 'labels', binding: 'labelsBinding' },
    { value: 'comparisonAttributes', binding: 'comparisonAttributesBinding' },
    { value: 'rationale', binding: 'rationaleBinding' },
    { value: 'reviewReason', binding: 'reviewReasonBinding' },
] as const
export type CatalogGapValue = typeof CATALOG_GAP_FIELDS[number]['value']
export type CatalogGapBinding = typeof CATALOG_GAP_FIELDS[number]['binding']
export type CatalogGapRecord = {
    id?: string
    requestedById?: string
    providerId?: string | null
    proposedSlug?: string
    categorySlug?: string
    priceType?: string
} & Partial<Record<CatalogGapValue | CatalogGapBinding, unknown>>

export function catalogGapContext(record: CatalogGapRecord) {
    if (!record.requestedById || !UUID.test(record.requestedById)
        || (record.providerId !== null && record.providerId !== undefined && !UUID.test(record.providerId))
        || !record.proposedSlug || record.proposedSlug.length > 256
        || !record.categorySlug || record.categorySlug.length > 256
        || !record.priceType || record.priceType.length > 64) {
        throw new Error('Encrypted catalog gap owner scope is invalid.')
    }
    return JSON.stringify([record.requestedById.toLowerCase(), record.providerId?.toLowerCase() ?? null,
        record.proposedSlug, record.categorySlug, record.priceType])
}

export function serializeCatalogGapField(field: CatalogGapValue, value: unknown): string {
    if (field === 'labels') {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Encrypted catalog gap labels are invalid.')
        return JSON.stringify(value)
    }
    if (field === 'comparisonAttributes') {
        if (!Array.isArray(value)) throw new Error('Encrypted catalog gap comparison attributes are invalid.')
        return JSON.stringify(value)
    }
    if (typeof value !== 'string') throw new Error(`Encrypted catalog gap ${field} is invalid.`)
    return value
}

export function sealCatalogGapFields(record: CatalogGapRecord) {
    if (!CATALOG_GAP_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted catalog gap record ID is missing.')
    const context = catalogGapContext(record)
    for (const { value, binding } of CATALOG_GAP_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        record[binding] = plaintext === null ? null
            : createPlaintextRecordBinding(TABLE, value, serializeCatalogGapField(value, plaintext), record.id, context)
    }
}

export function openCatalogGapFields(record: CatalogGapRecord) {
    if (!CATALOG_GAP_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted catalog gap record ID is missing.')
    const context = catalogGapContext(record)
    const allowLegacy = !requireCatalogGapRecordBinding()
    for (const { value, binding } of CATALOG_GAP_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        if (plaintext === null) {
            if (record[binding] !== null && record[binding] !== undefined) {
                throw new Error(`Encrypted catalog gap ${value} binding is invalid.`)
            }
            continue
        }
        verifyPlaintextRecordBinding(TABLE, value, serializeCatalogGapField(value, plaintext), record.id,
            record[binding] as string | null | undefined, { allowLegacy, context })
    }
}
