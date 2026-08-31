const DEFAULT_REAL_API_BASE_URL = 'http://127.0.0.1:4000'
const DEFAULT_TIMEOUT_MS = 3_000

function parseBaseUrl(value) {
    const raw = String(value ?? DEFAULT_REAL_API_BASE_URL).trim()
    let parsed
    try {
        parsed = new URL(raw)
    } catch {
        throw new Error('REAL_API_BASE_URL must be an absolute HTTP(S) URL.')
    }

    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
        throw new Error('REAL_API_BASE_URL must use HTTP or HTTPS and include a hostname.')
    }

    // The test suite appends API paths to this base. Query strings and fragments
    // would make the health probe ambiguous and could accidentally expose input
    // when diagnostics are printed, so reject them before any network request.
    if (parsed.search || parsed.hash) {
        throw new Error('REAL_API_BASE_URL must not include a query string or fragment.')
    }

    const pathname = parsed.pathname.replace(/\/+$/, '')
    const safeBaseUrl = `${parsed.origin}${pathname}`
    return {
        healthUrl: `${safeBaseUrl}/health/live`,
        safeBaseUrl: safeBaseUrl || parsed.origin,
    }
}

function createTimeoutSignal(timeoutMs) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    return { controller, timer }
}

export function getRealApiHealthUrl(environment = process.env) {
    return parseBaseUrl(environment.REAL_API_BASE_URL).healthUrl
}

export function formatRealApiPreflightFailure(baseUrl, reason = 'health check failed') {
    return [
        `Real API preflight failed for ${baseUrl}: ${reason}.`,
        'Start PostgreSQL and Redis, then run: npm run server:build && npm run server:start',
        'Rerun: npm run test:e2e:real',
    ].join('\n')
}

export async function assertRealApiReachable(
    baseUrl = process.env.REAL_API_BASE_URL,
    fetchImpl = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
) {
    const { healthUrl, safeBaseUrl } = parseBaseUrl(baseUrl)
    const { controller, timer } = createTimeoutSignal(timeoutMs)

    try {
        const response = await fetchImpl(healthUrl, {
            headers: { accept: 'application/json' },
            signal: controller.signal,
        })
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(formatRealApiPreflightFailure(safeBaseUrl, `timed out after ${timeoutMs} ms`))
        }

        const reason = error instanceof Error && /^HTTP \d{3}$/.test(error.message)
            ? error.message
            : 'the health endpoint is not reachable'
        throw new Error(formatRealApiPreflightFailure(safeBaseUrl, reason))
    } finally {
        clearTimeout(timer)
    }

    return { baseUrl: safeBaseUrl, healthUrl }
}

if (process.argv[1]?.endsWith('check-real-api.mjs')) {
    try {
        const result = await assertRealApiReachable()
        console.log(`Real API is reachable at ${result.baseUrl}.`)
    } catch (error) {
        console.error(error instanceof Error ? error.message : 'Real API preflight failed.')
        process.exitCode = 1
    }
}
