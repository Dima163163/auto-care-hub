import { describe, expect, it } from 'vitest'

import { autoCareDiscoveryQuerySchema, createAutoCareBroadcastRequestSchema, createAutoCareGuaranteeClaimSchema, createAutoCareServiceOfferSchema, createAutoCareServiceRequestSchema, serviceMessageOfferDecisionSchema, updateAutoCareOfferSchema } from './autocare.schemas.js'

const validRequest = {
    providerId: '11111111-1111-4111-8111-111111111111',
    locationId: '22222222-2222-4222-8222-222222222222',
    offeringId: '33333333-3333-4333-8333-333333333333',
    preferredAt: '2026-08-14T10:00:00.000Z',
    vehicleId: '44444444-4444-4444-8444-444444444444',
    vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, licensePlate: 'A123BC163', internalNumber: 'AC-001', vin: 'WBA1234567890ABCD' },
    contactSnapshot: { name: 'Alex Client', email: 'alex@example.com', phone: '+79990000000' },
    note: 'Please call before starting work.',
}

describe('AutoCare service request schema', () => {
    it('accepts the persisted request contract', () => {
        expect(createAutoCareServiceRequestSchema.parse(validRequest)).toMatchObject(validRequest)
    })

    it('allows a request without a vehicle snapshot', () => {
        const result = createAutoCareServiceRequestSchema.safeParse({ ...validRequest, vehicleSnapshot: null })
        expect(result.success).toBe(true)
    })

    it('keeps vehicle identity fields in the request snapshot contract', () => {
        const parsed = createAutoCareServiceRequestSchema.parse(validRequest)
        expect(parsed.vehicleId).toBe(validRequest.vehicleId)
        expect(parsed.vehicleSnapshot).toMatchObject({ licensePlate: 'A123BC163', internalNumber: 'AC-001', vin: 'WBA1234567890ABCD' })
    })

    it('rejects incomplete contact data and invalid appointment dates', () => {
        const result = createAutoCareServiceRequestSchema.safeParse({
            ...validRequest,
            preferredAt: 'tomorrow morning',
            contactSnapshot: { name: 'A', email: 'not-an-email', phone: '' },
        })
        expect(result.success).toBe(false)
    })

    it('validates discount offers and decisions for the service chat', () => {
        const offer = createAutoCareServiceOfferSchema.safeParse({
            type: 'discount',
            title: 'Скидка на повторный визит',
            description: 'Действует семь дней.',
            discountPercent: 15,
            expiresAt: '2026-08-21T23:59:59.000Z',
        })
        expect(offer.success).toBe(true)
        expect(createAutoCareServiceOfferSchema.safeParse({ type: 'discount', title: 'Без процента' }).success).toBe(false)
        expect(serviceMessageOfferDecisionSchema.parse({ decision: 'accept' })).toEqual({ decision: 'accept' })
    })

    it('accepts only the two supported booking modes for provider offerings', () => {
        expect(updateAutoCareOfferSchema.parse({ description: null, priceFromMinor: 2_900_00, bookingMode: 'instant' }).bookingMode).toBe('instant')
        expect(updateAutoCareOfferSchema.safeParse({ description: null, priceFromMinor: 2_900_00, bookingMode: 'manual' }).success).toBe(false)
    })

    it('parses false discovery query flags as false instead of enabling filters', () => {
        const parsed = autoCareDiscoveryQuerySchema.parse({
            serviceId: 'oil-change',
            marketId: 'ru-moscow',
            radiusKm: '25',
            availableToday: 'false',
            verifiedOnly: 'false',
            warrantyOnly: 'false',
            hasBonus: 'false',
        })

        expect(parsed).toMatchObject({
            availableToday: false,
            verifiedOnly: false,
            warrantyOnly: false,
            hasBonus: false,
        })
    })

    it('rejects public broadcast photo URLs until private media storage is available', () => {
        const base = { serviceDefinitionId: 'oil-change', issueDescription: 'Нужна диагностика двигателя' }
        expect(createAutoCareBroadcastRequestSchema.safeParse({ ...base, photoUrls: ['https://evil.example/photo.webp'] }).success).toBe(false)
        expect(createAutoCareBroadcastRequestSchema.safeParse({ ...base, photoUrls: ['private://autocare/requests/../photo'] }).success).toBe(false)
        expect(createAutoCareBroadcastRequestSchema.parse({ ...base, photoUrls: ['private://autocare/requests/request-1/photo-1'] }).photoUrls).toEqual(['private://autocare/requests/request-1/photo-1'])
    })

    it('keeps guarantee evidence in the private claims media namespace', () => {
        const base = { requestId: '11111111-1111-4111-8111-111111111111', claimType: 'quality', summary: 'The agreed repair result was not delivered.' }
        expect(createAutoCareGuaranteeClaimSchema.safeParse({ ...base, evidenceUrls: ['https://evil.example/evidence.jpg'] }).success).toBe(false)
        expect(createAutoCareGuaranteeClaimSchema.safeParse({ ...base, evidenceUrls: ['private://autocare/claims/../evidence.jpg'] }).success).toBe(false)
        expect(createAutoCareGuaranteeClaimSchema.parse({ ...base, evidenceUrls: ['private://autocare/claims/request-1/evidence.jpg'] }).evidenceUrls).toEqual(['private://autocare/claims/request-1/evidence.jpg'])
    })
})
