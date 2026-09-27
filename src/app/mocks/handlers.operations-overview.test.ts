import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'

import { handlers } from './handlers'
import { clearMockSession, setMockSession } from './session'

const server = setupServer(...handlers)
server.listen({ onUnhandledRequest: 'error' })
afterEach(() => clearMockSession())
afterAll(() => server.close())

describe('mock admin operations overview permissions', () => {
    it('matches the backend boundary for admins and super-admins', async () => {
        setMockSession({ currentUserId: 'user-admin-moderator-1', currentRole: 'admin' })
        const adminResponse = await fetch('http://localhost:3000/api/admin/operations/overview')
        expect(adminResponse.status).toBe(200)
        expect(await adminResponse.json()).toMatchObject({ overallStatus: 'healthy' })

        setMockSession({ currentUserId: 'user-client-1', currentRole: 'client' })
        const clientResponse = await fetch('http://localhost:3000/api/admin/operations/overview')
        expect(clientResponse.status).toBe(403)
    })
})
