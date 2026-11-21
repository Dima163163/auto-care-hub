import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { setupServer } from 'msw/node'

import { mockUsers } from './data'
import { handlers } from './handlers'
import { clearMockSession, setMockSession } from './session'

const server = setupServer(...handlers)
server.listen({ onUnhandledRequest: 'error' })
afterEach(() => {
    clearMockSession()
    vi.restoreAllMocks()
})
afterAll(() => server.close())

const booking = {
    providerId: 'api-proservice-moscow',
    locationId: 'location-proservice-moscow',
    offeringId: 'offer-api-proservice-moscow-oil-change',
    preferredAt: '2026-09-27T06:30:00.000Z',
    contactSnapshot: { name: 'Mock Client', phone: '+49 151 00000001', email: 'client@example.test' },
    dataProcessingConsent: true,
}

function submitBooking(body: string, idempotencyKey?: string) {
    const headers = new Headers({ 'content-type': 'application/json' })
    if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey)
    return fetch('http://localhost:3000/api/v1/service-requests', { method: 'POST', headers, body })
}

describe('mock service request workflow', () => {
    it('uses the server status and error code for invalid input, role and missing offers', async () => {
        const denied = await submitBooking(JSON.stringify(booking))
        expect(denied.status).toBe(401)
        expect(await denied.json()).toMatchObject({ code: 'UNAUTHORIZED' })

        setMockSession({ currentUserId: 'user-owner-1', currentRole: 'owner' })
        const forbidden = await submitBooking(JSON.stringify(booking))
        expect(forbidden.status).toBe(403)
        expect(await forbidden.json()).toMatchObject({ code: 'FORBIDDEN' })

        setMockSession({ currentUserId: 'user-client-1', currentRole: 'client' })
        for (const invalidBody of ['null', JSON.stringify({ ...booking, dataProcessingConsent: false })]) {
            const invalid = await submitBooking(invalidBody)
            expect(invalid.status).toBe(400)
            expect(await invalid.json()).toMatchObject({ code: 'VALIDATION_ERROR' })
        }
        const missing = await submitBooking(JSON.stringify({ ...booking, offeringId: 'unknown-offering' }))
        expect(missing.status).toBe(404)
        expect(await missing.json()).toMatchObject({ code: 'NOT_FOUND' })
    })

    it('requires verified email before making a request', async () => {
        const index = mockUsers.findIndex(({ id }) => id === 'user-client-1')
        const client = mockUsers[index]!
        mockUsers[index] = { ...client, emailVerifiedAt: null }
        try {
            setMockSession({ currentUserId: client.id, currentRole: 'client' })
            const response = await submitBooking(JSON.stringify(booking))
            expect(response.status).toBe(403)
            expect(await response.json()).toMatchObject({ code: 'EMAIL_VERIFICATION_REQUIRED' })
        } finally {
            mockUsers[index] = client
        }
    })

    it('replays an identical request and rejects changes under the same key', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-26T12:33:00.000Z'))
        setMockSession({ currentUserId: 'user-client-1', currentRole: 'client' })
        const key = 'mock-service-request-replay'
        const initial = await submitBooking(JSON.stringify(booking), key)
        expect(initial.status).toBe(201)
        const replay = await submitBooking(JSON.stringify(booking), key)
        expect(replay.status).toBe(200)
        expect(await replay.json()).toEqual(await initial.json())
        const conflict = await submitBooking(JSON.stringify({ ...booking, note: 'Different request' }), key)
        expect(conflict.status).toBe(409)
        expect(await conflict.json()).toMatchObject({ code: 'CONFLICT' })
    })
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
