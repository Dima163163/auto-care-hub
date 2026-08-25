import { HttpResponse } from 'msw'

/** UI-state switch used by local mock mode. It is ignored by the real API. */
export type MockScenario = 'default' | 'empty' | 'error' | 'stale' | 'offline' | 'permission-denied' | 'suspended'

const scenarios = new Set<MockScenario>([
    'default', 'empty', 'error', 'stale', 'offline', 'permission-denied', 'suspended',
])

export function getMockScenario(request: Request): MockScenario {
    const value = request.headers.get('x-autocare-mock-state') ?? new URL(request.url).searchParams.get('mockState')
    return value && scenarios.has(value as MockScenario) ? value as MockScenario : 'default'
}

export function mockScenarioResponse(request: Request): Response | undefined {
    const scenario = getMockScenario(request)
    if (scenario === 'default' || scenario === 'empty') return undefined

    const status = scenario === 'permission-denied' ? 403 : scenario === 'suspended' ? 423 : 503
    const code = scenario === 'offline' ? 'OFFLINE' : scenario === 'stale' ? 'STALE_DATA' : scenario === 'suspended' ? 'ACCOUNT_SUSPENDED' : scenario === 'permission-denied' ? 'PERMISSION_DENIED' : 'MOCK_FAILURE'
    return HttpResponse.json({ code, message: `Mock ${scenario} state`, stale: scenario === 'stale' }, { status })
}

export function isMockEmpty(request: Request) {
    return getMockScenario(request) === 'empty'
}
