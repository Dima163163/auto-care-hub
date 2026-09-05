import type { AutoCareQuoteLineItemResponse } from './autocare.types.js'
import { normalizeAutoCareRequestUuid } from './request-input-policy.js'

export type NormalizedAutoCareQuoteDecisionInput = {
    quoteId: string
    quoteVersion: number
}

export function normalizeAutoCareQuoteDecisionInput(value: unknown): NormalizedAutoCareQuoteDecisionInput | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const raw = value as Record<string, unknown>
    const quoteId = normalizeAutoCareRequestUuid(raw.quoteId)
    const quoteVersion = raw.quoteVersion
    if (!quoteId || typeof quoteVersion !== 'number' || !Number.isSafeInteger(quoteVersion) || quoteVersion < 1) return null
    return { quoteId, quoteVersion }
}

export type NormalizedAutoCareServiceQuoteInput = {
    amountMinor: number
    currencyCode: string
    note: string | null
    lineItems: AutoCareQuoteLineItemResponse[]
    taxMinor: number
    feesMinor: number
    validUntil: string | null
    priceLocked: boolean
}

const MAX_AMOUNT_MINOR = 1_000_000_000
const MAX_NOTE_LENGTH = 4_000
const MAX_LINE_ITEMS = 100
const MAX_LINE_ITEM_TITLE_LENGTH = 160
const MAX_QUANTITY = 10_000
const invalid = Symbol('invalid')

type Invalid = typeof invalid

const lineItemKinds = new Set<AutoCareQuoteLineItemResponse['kind']>(['part', 'labour', 'consumable', 'tax', 'fee', 'discount'])
const datetimeWithOffsetPattern = /(?:Z|[+-]\d{2}:\d{2})$/

function requiredAmount(value: unknown): number | Invalid {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= MAX_AMOUNT_MINOR ? value : invalid
}

function optionalNonNegativeAmount(value: unknown): number | Invalid {
    if (value === undefined) return 0
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_AMOUNT_MINOR ? value : invalid
}

function optionalNote(value: unknown): string | null | Invalid {
    if (value === undefined || value === null) return null
    if (typeof value !== 'string') return invalid
    const note = value.normalize('NFKC').trim()
    return note.length <= MAX_NOTE_LENGTH ? note || null : invalid
}

function requiredCurrency(value: unknown): string | Invalid {
    if (typeof value !== 'string') return invalid
    const currencyCode = value.normalize('NFKC').trim().toUpperCase()
    return /^[A-Z]{3}$/.test(currencyCode) ? currencyCode : invalid
}

function optionalValidUntil(value: unknown): string | null | Invalid {
    if (value === undefined || value === null) return null
    if (typeof value !== 'string') return invalid
    const validUntil = value.normalize('NFKC').trim()
    return datetimeWithOffsetPattern.test(validUntil) && Number.isFinite(Date.parse(validUntil)) ? validUntil : invalid
}

function normalizeLineItems(value: unknown): AutoCareQuoteLineItemResponse[] | Invalid {
    if (value === undefined) return []
    if (!Array.isArray(value) || value.length > MAX_LINE_ITEMS) return invalid
    const lineItems: AutoCareQuoteLineItemResponse[] = []
    for (const item of value) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return invalid
        const raw = item as Record<string, unknown>
        if (typeof raw.kind !== 'string' || !lineItemKinds.has(raw.kind as AutoCareQuoteLineItemResponse['kind'])) return invalid
        if (typeof raw.title !== 'string') return invalid
        const title = raw.title.normalize('NFKC').trim()
        if (title.length < 1 || title.length > MAX_LINE_ITEM_TITLE_LENGTH) return invalid
        if (typeof raw.quantity !== 'number' || !Number.isFinite(raw.quantity) || raw.quantity <= 0 || raw.quantity > MAX_QUANTITY) return invalid
        if (typeof raw.unitPriceMinor !== 'number' || !Number.isSafeInteger(raw.unitPriceMinor) || raw.unitPriceMinor < -MAX_AMOUNT_MINOR || raw.unitPriceMinor > MAX_AMOUNT_MINOR) return invalid
        lineItems.push({
            kind: raw.kind as AutoCareQuoteLineItemResponse['kind'],
            title,
            quantity: raw.quantity,
            unitPriceMinor: raw.unitPriceMinor,
            totalMinor: Math.round(raw.quantity * raw.unitPriceMinor),
        })
    }
    return lineItems
}

/**
 * Quote routes validate this payload with Zod, but the service is also called
 * directly by jobs, tests and replay handlers. Normalize every persisted field
 * at that boundary so malformed JSON cannot become a quote snapshot.
 */
export function normalizeAutoCareServiceQuoteInput(input: unknown): NormalizedAutoCareServiceQuoteInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    const amountMinor = requiredAmount(value.amountMinor)
    if (amountMinor === invalid) return null
    const currencyCode = requiredCurrency(value.currencyCode)
    if (currencyCode === invalid) return null
    const note = optionalNote(value.note)
    if (note === invalid) return null
    const lineItems = normalizeLineItems(value.lineItems)
    if (lineItems === invalid) return null
    const taxMinor = optionalNonNegativeAmount(value.taxMinor)
    if (taxMinor === invalid) return null
    const feesMinor = optionalNonNegativeAmount(value.feesMinor)
    if (feesMinor === invalid) return null
    const validUntil = optionalValidUntil(value.validUntil)
    if (validUntil === invalid) return null
    if (value.priceLocked !== undefined && typeof value.priceLocked !== 'boolean') return null

    return {
        amountMinor,
        currencyCode,
        note,
        lineItems,
        taxMinor,
        feesMinor,
        validUntil,
        priceLocked: value.priceLocked ?? false,
    }
}
