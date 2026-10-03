import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from './handlers'
import { clearMockSession, setMockSession } from './session'

const server = setupServer(...handlers)
server.listen({ onUnhandledRequest: 'error' })
afterEach(() => { clearMockSession(); vi.restoreAllMocks() })
afterAll(() => server.close())
const base = 'http://localhost:3000'
async function createRequest(marketId = 'market-moscow', serviceDefinitionId = 'definition-oil-change') {
    setMockSession({ currentUserId: 'user-client-1', currentRole: 'client' })
    const response = await fetch(`${base}/api/v1/broadcast-requests`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ marketId, serviceDefinitionId, issueDescription: 'Synthetic private repair details' }) })
    expect(response.status).toBe(201)
    return await response.json() as { id: string }
}
describe('mock broadcast participant access', () => {
    it('allows the requesting client and denies unauthenticated/foreign/privileged/unassigned users', async () => {
        const item = await createRequest()
        expect((await fetch(`${base}/api/v1/broadcast-requests/${item.id}`)).status).toBe(200)
        clearMockSession()
        expect((await fetch(`${base}/api/v1/broadcast-requests/${item.id}`)).status).toBe(401)
        for (const [currentUserId, currentRole] of [['user-client-2', 'client'], ['user-admin-moderator-1', 'admin'], ['user-admin-1', 'super_admin'], ['user-owner-2', 'owner']] as const) {
            setMockSession({ currentUserId, currentRole })
            expect((await fetch(`${base}/api/v1/broadcast-requests/${item.id}`)).status).toBe(403)
        }
    })
    it('allows scoped provider participants but denies other markets/services in detail and inbox', async () => {
        const valid = await createRequest()
        const foreign = await createRequest('market-samara')
        const unsupported = await createRequest('market-moscow', 'definition-not-offered')
        setMockSession({ currentUserId: 'user-staff-proservice-1', currentRole: 'owner' })
        const response = await fetch(`${base}/api/v1/broadcast-requests/${valid.id}`)
        expect(response.status).toBe(200)
        expect(await response.json()).toMatchObject({ id: valid.id, offers: [] })
        for (const item of [foreign, unsupported]) expect((await fetch(`${base}/api/v1/broadcast-requests/${item.id}`)).status).toBe(403)
        const inbox = await (await fetch(`${base}/api/owner/broadcast-requests`)).json() as Array<{ id: string }>
        expect(inbox.some((item) => item.id === valid.id)).toBe(true)
        expect(inbox.some((item) => item.id === foreign.id || item.id === unsupported.id)).toBe(false)
    })
    it('filters competing offers by branch and preserves prior-participant access after expiry', async () => {
        const item = await createRequest()
        setMockSession({ currentUserId: 'user-owner-1', currentRole: 'owner' })
        for (const locationId of ['location-proservice-moscow', 'location-autolux-moscow']) {
            const response = await fetch(`${base}/api/owner/broadcast-requests/${item.id}/offers`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ locationId, amountMinor: 10000 }) })
            expect(response.status).toBe(201)
        }
        setMockSession({ currentUserId: 'user-client-1', currentRole: 'client' })
        expect((await (await fetch(`${base}/api/v1/broadcast-requests/${item.id}`)).json()).offers).toHaveLength(2)
        vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 72 * 60 * 60 * 1000)
        setMockSession({ currentUserId: 'user-staff-proservice-1', currentRole: 'owner' })
        const detail = await fetch(`${base}/api/v1/broadcast-requests/${item.id}`)
        expect(detail.status).toBe(200)
        const result = await detail.json() as { offers: Array<{ providerId: string }> }
        expect(result.offers).toHaveLength(1)
        expect(result.offers[0]?.providerId).toBe('api-proservice-moscow')
    })

})
