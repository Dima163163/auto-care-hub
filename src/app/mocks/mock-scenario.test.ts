import { describe, expect, it } from 'vitest'

import { getMockScenario, isMockEmpty, isMockPartial, mockScenarioResponse } from './mock-scenario'

function request(state?: string) {
    return new Request(`http://localhost/api/v1/discovery/providers${state ? `?mockState=${state}` : ''}`, {
        headers: state ? { 'x-autocare-mock-state': state } : undefined,
    })
}

describe('mock UI scenarios', () => {
    it('defaults to the normal mock contract', () => {
        expect(getMockScenario(request())).toBe('default')
        expect(mockScenarioResponse(request())).toBeUndefined()
    })

    it('supports empty collections without turning them into errors', () => {
        expect(isMockEmpty(request('empty'))).toBe(true)
        expect(mockScenarioResponse(request('empty'))).toBeUndefined()
    })

    it('supports partial data and expired sessions as explicit test states', async () => {
        expect(isMockPartial(request('partial'))).toBe(true)
        expect(mockScenarioResponse(request('partial'))).toBeUndefined()

        const response = mockScenarioResponse(request('expired-session'))
        expect(response?.status).toBe(401)
        await expect(response?.json()).resolves.toMatchObject({ code: 'SESSION_EXPIRED' })
    })

    it.each([
        ['offline', 503, 'OFFLINE'],
        ['permission-denied', 403, 'PERMISSION_DENIED'],
        ['suspended', 423, 'ACCOUNT_SUSPENDED'],
        ['stale', 503, 'STALE_DATA'],
        ['expired-session', 401, 'SESSION_EXPIRED'],
    ] as const)('maps %s to the API error contract', async (state, status, code) => {
        const response = mockScenarioResponse(request(state))
        expect(response?.status).toBe(status)
        await expect(response?.json()).resolves.toMatchObject({ code })
    })
})
