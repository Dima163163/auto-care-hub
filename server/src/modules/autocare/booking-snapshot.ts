import type { AutoCareBookingSnapshotResponse, AutoCareQuoteLineItemResponse } from './autocare.types.js'

export type AutoCareBookingSnapshotInput = {
    requestId: string
    quoteVersion: number
    amountMinor: number
    currencyCode: string
    lineItems: AutoCareQuoteLineItemResponse[]
    scheduledAt: string
    timezone: string
    serviceSlug: string
    providerId: string
    locationId: string
    createdAt: string
}

export function createAutoCareBookingSnapshot(input: AutoCareBookingSnapshotInput): AutoCareBookingSnapshotResponse {
    return {
        ...input,
        lineItems: input.lineItems.map((item) => ({ ...item })),
        status: 'confirmed',
    }
}
