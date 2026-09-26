import { describe, expect, it } from 'vitest'

import { autoCareOfferSchema, autoCareQuoteSchema, autoCareServiceAttachmentSchema } from './autocareApi'

const offer = {
    id: 'offer-1',
    serviceDefinitionId: 'service-1',
    priceFromMinor: 120_000,
    priceToMinor: 150_000,
    currencyCode: 'RUB',
    durationMinutes: 60,
    inclusions: [],
    warrantyText: null,
    active: true,
}

const quote = {
    amountMinor: 120_000,
    lineItems: [{ kind: 'part', title: 'Part', quantity: 1, unitPriceMinor: 100_000, totalMinor: 100_000 }],
    subtotalMinor: 100_000,
    taxMinor: 20_000,
    feesMinor: 0,
    currencyCode: 'RUB',
    note: null,
    validUntil: null,
    priceLocked: true,
    status: 'pending',
    createdAt: '2026-09-23T10:00:00.000Z',
}

describe('automotive API runtime schemas', () => {
    it('accepts integer nonnegative offer prices and ordered ranges', () => {
        expect(autoCareOfferSchema.safeParse(offer).success).toBe(true)
        expect(autoCareOfferSchema.safeParse({ ...offer, priceToMinor: null }).success).toBe(true)
    })

    it.each([-1, 1.5])('rejects invalid offer minor-unit start amounts: %s', (priceFromMinor) => {
        expect(autoCareOfferSchema.safeParse({ ...offer, priceFromMinor }).success).toBe(false)
    })

    it('rejects negative, fractional and inverted offer price ranges', () => {
        expect(autoCareOfferSchema.safeParse({ ...offer, priceToMinor: -1 }).success).toBe(false)
        expect(autoCareOfferSchema.safeParse({ ...offer, priceToMinor: 1.5 }).success).toBe(false)
        expect(autoCareOfferSchema.safeParse({ ...offer, priceFromMinor: 150_001, priceToMinor: 150_000 }).success).toBe(false)
    })

    it('accepts the complete server quote DTO including a negative discount line item', () => {
        expect(autoCareQuoteSchema.safeParse({
            ...quote,
            lineItems: [
                ...quote.lineItems,
                { kind: 'discount', title: 'Discount', quantity: 1, unitPriceMinor: -5_000, totalMinor: -5_000 },
            ],
        }).success).toBe(true)
    })

    it('rejects negative or fractional quote aggregate minor-unit amounts', () => {
        for (const field of ['amountMinor', 'subtotalMinor', 'taxMinor', 'feesMinor'] as const) {
            expect(autoCareQuoteSchema.safeParse({ ...quote, [field]: -1 }).success, field).toBe(false)
            expect(autoCareQuoteSchema.safeParse({ ...quote, [field]: 1.5 }).success, field).toBe(false)
        }
    })

    it('requires quote DTO fields that the server always returns', () => {
        const incomplete = {
            amountMinor: quote.amountMinor,
            currencyCode: quote.currencyCode,
            note: quote.note,
            taxMinor: quote.taxMinor,
            feesMinor: quote.feesMinor,
            validUntil: quote.validUntil,
            priceLocked: quote.priceLocked,
            status: quote.status,
            createdAt: quote.createdAt,
        }
        expect(autoCareQuoteSchema.safeParse(incomplete).success).toBe(false)
    })

    it('rejects fractional and unsafe quote line-item minor amounts without restricting signed discounts', () => {
        expect(autoCareQuoteSchema.safeParse({
            ...quote,
            lineItems: [{ kind: 'discount', title: 'Discount', quantity: 1, unitPriceMinor: -5_000, totalMinor: -5_000 }],
        }).success).toBe(true)
        expect(autoCareQuoteSchema.safeParse({
            ...quote,
            lineItems: [{ kind: 'part', title: 'Part', quantity: 1, unitPriceMinor: 1.5, totalMinor: 1 }],
        }).success).toBe(false)
    })

    it('rejects non-ISO quote timestamps', () => {
        expect(autoCareQuoteSchema.safeParse({ ...quote, createdAt: 'tomorrow morning' }).success).toBe(false)
        expect(autoCareQuoteSchema.safeParse({ ...quote, validUntil: 'tomorrow morning' }).success).toBe(false)
    })

    it('accepts only the supported image MIME types for chat attachments', () => {
        const attachment = {
            id: 'attachment-1',
            uploadedById: 'user-1',
            contentType: 'image/jpeg',
            bytes: 10,
            status: 'ready',
            url: '/media/attachment-1',
            createdAt: '2026-09-23T10:00:00.000Z',
        }
        expect(autoCareServiceAttachmentSchema.safeParse(attachment).success).toBe(true)
        expect(autoCareServiceAttachmentSchema.safeParse({ ...attachment, contentType: 'image/svg+xml' }).success).toBe(false)
        expect(autoCareServiceAttachmentSchema.safeParse({ ...attachment, createdAt: 'not a date' }).success).toBe(false)
    })
})
