import { HttpResponse } from 'msw'

/** UI-state switch used by local mock mode. It is ignored by the real API. */
export type MockScenario = 'default' | 'empty' | 'error' | 'stale' | 'offline' | 'permission-denied' | 'suspended' | 'partial' | 'expired-session'

const scenarios = new Set<MockScenario>([
    'default', 'empty', 'error', 'stale', 'offline', 'permission-denied', 'suspended', 'partial', 'expired-session',
])

export function getMockScenario(request: Request): MockScenario {
    const value = request.headers.get('x-autocare-mock-state') ?? new URL(request.url).searchParams.get('mockState')
    return value && scenarios.has(value as MockScenario) ? value as MockScenario : 'default'
}

export function mockScenarioResponse(request: Request): Response | undefined {
    const scenario = getMockScenario(request)
    if (scenario === 'default' || scenario === 'empty' || scenario === 'partial') return undefined

    const status = scenario === 'permission-denied' ? 403 : scenario === 'suspended' ? 423 : scenario === 'expired-session' ? 401 : 503
    const code = scenario === 'offline' ? 'OFFLINE' : scenario === 'stale' ? 'STALE_DATA' : scenario === 'suspended' ? 'ACCOUNT_SUSPENDED' : scenario === 'permission-denied' ? 'PERMISSION_DENIED' : scenario === 'expired-session' ? 'SESSION_EXPIRED' : 'MOCK_FAILURE'
    return HttpResponse.json({ code, message: `Mock ${scenario} state`, stale: scenario === 'stale' }, { status })
}

export function isMockEmpty(request: Request) {
    return getMockScenario(request) === 'empty'
}

export function isMockPartial(request: Request) {
    return getMockScenario(request) === 'partial'
}
