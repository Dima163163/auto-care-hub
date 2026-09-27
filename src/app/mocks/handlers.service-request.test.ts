import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { setupServer } from 'msw/node'

import { handlers } from './handlers'
import { clearMockSession, setMockSession } from './session'

const server = setupServer(...handlers)
server.listen({ onUnhandledRequest: 'error' })
afterEach(() => {
    clearMockSession()
    vi.restoreAllMocks()
})
afterAll(() => server.close())

describe('mock service request workflow', () => {
    it('omits past slots and respects the service weekly schedule', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-26T12:53:00.000Z'))

        const response = await fetch('http://localhost:3000/api/v1/providers/api-proservice-moscow/availability?date=2026-09-26&locationId=location-proservice-moscow&offeringId=offer-api-proservice-moscow-oil-change')

        expect(response.status).toBe(200)
        const availability = await response.json() as { timezone: string; slots: Array<{ startTime: string; startsAt: string }> }
        expect(availability.timezone).toBe('Europe/Moscow')
        expect(availability.slots.some((slot) => slot.startTime === '15:30')).toBe(false)
        expect(availability.slots.find((slot) => slot.startTime === '16:00')?.startsAt).toBe('2026-09-26T13:00:00.000Z')
        expect(availability.slots.map((slot) => slot.startTime)).toEqual(['16:00', '16:30', '17:00'])
    })

    it('rejects a past slot submitted directly to the mock API', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-26T12:53:00.000Z'))
        setMockSession({ currentUserId: 'user-client-1', currentRole: 'client' })

        const response = await fetch('http://localhost:3000/api/v1/service-requests', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                providerId: 'api-proservice-moscow',
                locationId: 'location-proservice-moscow',
                offeringId: 'offer-api-proservice-moscow-oil-change',
                preferredAt: '2026-09-26T07:30:00.000Z',
                contactSnapshot: { name: 'Emily Carter', phone: '+49 151 00000001', email: 'emily.carter@example.com' },
                dataProcessingConsent: true,
            }),
        })

        expect(response.status).toBe(409)
    })

    it('carries the service timezone from client submission into the owner queue', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-26T12:53:00.000Z'))
        setMockSession({ currentUserId: 'user-client-1', currentRole: 'client' })
        const createResponse = await fetch('http://localhost:3000/api/v1/service-requests', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                providerId: 'api-proservice-moscow',
                locationId: 'location-proservice-moscow',
                offeringId: 'offer-api-proservice-moscow-oil-change',
                preferredAt: '2026-09-27T06:00:00.000Z',
                contactSnapshot: { name: 'Emily Carter', phone: '+49 151 00000001', email: 'emily.carter@example.com' },
                note: 'Timezone contract check.',
                dataProcessingConsent: true,
            }),
        })

        expect(createResponse.status).toBe(201)
        const createdRequest = await createResponse.json() as { id: string; preferredAt: string; timezone?: string | null }
        expect(createdRequest).toMatchObject({
            preferredAt: '2026-09-27T06:00:00.000Z',
            timezone: 'Europe/Moscow',
        })

        setMockSession({ currentUserId: 'user-owner-1', currentRole: 'owner' })
        const ownerResponse = await fetch('http://localhost:3000/api/owner/service-requests')
        expect(ownerResponse.status).toBe(200)
        const ownerRequests = await ownerResponse.json() as Array<{ id: string; preferredAt: string; timezone?: string | null }>
        expect(ownerRequests.find((request) => request.id === createdRequest.id)).toMatchObject({
            preferredAt: '2026-09-27T06:00:00.000Z',
            timezone: 'Europe/Moscow',
        })
    })
})
