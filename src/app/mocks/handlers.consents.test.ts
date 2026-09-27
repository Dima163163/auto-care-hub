import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'

import { handlers } from './handlers'
import { clearMockSession, setMockSession } from './session'

const server = setupServer(...handlers)
server.listen({ onUnhandledRequest: 'error' })
afterEach(() => clearMockSession())
afterAll(() => server.close())

describe('mock user consent API', () => {
    it('returns, updates and persists optional consent choices', async () => {
        setMockSession({ currentUserId: 'user-client-1', currentRole: 'client' })

        const initialResponse = await fetch('http://localhost:3000/api/users/me/consents')
        expect(initialResponse.status).toBe(200)
        const initial = await initialResponse.json() as { consents: { analytics: { granted: boolean }; marketing: { granted: boolean } } }
        expect(initial.consents.analytics.granted).toBe(false)
        expect(initial.consents.marketing.granted).toBe(false)

        const grantResponse = await fetch('http://localhost:3000/api/users/me/consents', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ analytics: true, marketing: true }),
        })
        expect(grantResponse.status).toBe(200)
        const granted = await grantResponse.json() as { consents: { analytics: { granted: boolean; version: string | null; recordedAt: string | null }; marketing: { granted: boolean } } }
        expect(granted.consents.analytics).toMatchObject({ granted: true, version: 'draft-2026-08-13' })
        expect(granted.consents.analytics.recordedAt).toEqual(expect.any(String))
        expect(granted.consents.marketing.granted).toBe(true)

        const revokeResponse = await fetch('http://localhost:3000/api/users/me/consents', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ analytics: false }),
        })
        expect(revokeResponse.status).toBe(200)
        const persisted = await (await fetch('http://localhost:3000/api/users/me/consents')).json() as { consents: { analytics: { granted: boolean }; marketing: { granted: boolean } } }
        expect(persisted.consents.analytics.granted).toBe(false)
        expect(persisted.consents.marketing.granted).toBe(true)

        await fetch('http://localhost:3000/api/users/me/consents', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ marketing: false }),
        })
    })

    it('requires a session and rejects empty updates', async () => {
        expect((await fetch('http://localhost:3000/api/users/me/consents')).status).toBe(401)
        setMockSession({ currentUserId: 'user-client-1', currentRole: 'client' })

        const response = await fetch('http://localhost:3000/api/users/me/consents', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({}),
        })
        expect(response.status).toBe(400)
    })
})
