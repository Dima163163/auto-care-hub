import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))

function check(name, source, fragments, detail) {
    const missing = fragments.filter((fragment) => !source.includes(fragment))
    return missing.length === 0
        ? { name, status: 'pass', detail }
        : { name, status: 'blocked', detail: `missing controls: ${missing.join('; ')}` }
}

/**
 * Keeps the local browser state matrix explicit. Runtime failures still need
 * browser execution, but this deterministic guard prevents a release from
 * silently dropping one of the required user-facing states or retry paths.
 */
export function evaluateStateMatrix(sourceMap) {
    return [
        check(
            'Client recoverable states',
            sourceMap.clientStates,
            [
                "scenario: 'error' | 'stale' | 'offline' | 'permission-denied' | 'suspended'",
                "for (const scenario of ['error', 'stale', 'offline', 'permission-denied', 'suspended'] as const)",
                "test(`uses a recoverable ${scenario} state",
            ],
            'mock client cabinet covers error, stale, offline, permission denied and suspended states',
        ),
        check(
            'Real recoverable states',
            sourceMap.realStates,
            [
                "type InjectedRequestState = 'error' | 'offline' | 'permission-denied' | 'stale' | 'suspended'",
                'expireAuthenticatedSession',
                'injectPartialDiscovery',
                'injectRealStaleAfterDiscoveryCacheFill',
                "for (const state of ['error', 'offline', 'permission-denied', 'stale', 'suspended'] as const)",
            ],
            'real API smoke covers partial/stale data, expired sessions and recoverable request states',
        ),
        check(
            'Review and attachment fixtures',
            sourceMap.clientStates,
            [
                "useReviewFixture(page, 'empty')",
                "useReviewFixture(page, 'one')",
                "useReviewFixture(page, 'photos')",
                "service-request-attachment-input",
                "service-request-attachment",
            ],
            'empty, single, photo review states and attachment viewer remain covered',
        ),
        check(
            'Communication modes',
            `${sourceMap.clientStates}\n${sourceMap.realStates}`,
            [
                "providerId: 'api-proservice-moscow'",
                "providerId: 'api-autolux-moscow'",
                "providerId: 'api-formula-moscow'",
                "for (const mode of ['online', 'request_then_confirm', 'phone_only'] as const)",
                "mode === 'online'",
                "mode === 'request_then_confirm'",
            ],
            'online booking, request + callback and phone-only provider modes stay visible in browser coverage',
        ),
        check(
            'Retry and idempotency',
            `${sourceMap.clientStates}\n${sourceMap.realStates}`,
            [
                'failNextRequestSubmission',
                "['offline', 'timeout'] as const",
                'without losing the idempotency key',
                'real API keeps a repeated request idempotent in PostgreSQL',
                'persistedCount',
            ],
            'offline/timeout retry preserves the key and a repeated real request persists once',
        ),
        check(
            'Mobile state shell',
            sourceMap.clientStates,
            [
                'page.setViewportSize({ width: 390, height: 844 })',
                'document.documentElement.scrollWidth <= window.innerWidth + 1',
                "page.goto('/profile/bookings')",
            ],
            'public service and client state shells are checked without mobile overflow',
        ),
    ]
}

export function loadStateMatrixSources(root = PROJECT_ROOT) {
    const files = {
        clientStates: 'e2e/autocare-client-public-states.spec.ts',
        realStates: 'e2e/autocare-real-mode.smoke.spec.ts',
    }

    return Object.fromEntries(Object.entries(files).map(([name, relativePath]) => [
        name,
        readFileSync(resolve(root, relativePath), 'utf8'),
    ]))
}

export function formatStateMatrixResults(results) {
    const lines = ['Browser state matrix source contract']
    for (const result of results) {
        lines.push(`[${result.status.toUpperCase()}] ${result.name}: ${result.detail}`)
    }
    return lines.join('\n')
}

async function main() {
    const results = evaluateStateMatrix(loadStateMatrixSources())
    console.log(formatStateMatrixResults(results))
    if (results.some((result) => result.status === 'blocked')) process.exitCode = 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
