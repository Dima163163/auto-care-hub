import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)

export const REQUIRED_STAGING_PATHS = [
    '/health/live',
    '/health/ready',
    '/v1/markets',
    '/v1/discovery/providers',
    '/v1/service-requests/{requestId}',
    '/v1/service-requests/{requestId}/quote/accept',
    '/v1/service-requests/{requestId}/quote/decline',
    '/v1/service-requests/{requestId}/reschedule/decision',
    '/owner/service-requests/{requestId}/quote',
    '/owner/service-requests/{requestId}/reschedule',
    '/openapi.json',
]

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000
const MAX_REQUEST_TIMEOUT_MS = 30_000
export const MAX_OPENAPI_RESPONSE_BYTES = 2 * 1024 * 1024
export const DEFAULT_RETRY_ATTEMPTS = 2
export const DEFAULT_RETRY_BACKOFF_MS = 100
export const STAGING_DISCOVERY_VARIANTS = ['radiusKm=25&limit=1', 'radiusKm=10&limit=1']

export function normalizeStagingApiBaseUrl(value) {
    const raw = String(value ?? '').trim()
    if (!raw) throw new Error('STAGING_API_BASE_URL must be a non-empty URL.')
    let parsed
    try {
        parsed = new URL(raw)
    } catch {
        throw new Error('STAGING_API_BASE_URL must be a valid absolute URL.')
    }
    const localHost = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(parsed.hostname)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('STAGING_API_BASE_URL must use http or https.')
    if (!localHost && parsed.protocol !== 'https:') throw new Error('STAGING_API_BASE_URL must use HTTPS outside localhost.')
    if (parsed.username || parsed.password) throw new Error('STAGING_API_BASE_URL must not contain embedded credentials.')
    parsed.hash = ''
    parsed.search = ''
    parsed.pathname = parsed.pathname.replace(/\/+$/, '')
    return parsed.toString().replace(/\/$/, '')
}

export function getRequestTimeoutMs(environment = process.env) {
    const configured = Number(environment.STAGING_API_TIMEOUT_MS ?? DEFAULT_REQUEST_TIMEOUT_MS)
    if (!Number.isInteger(configured) || configured < 1 || configured > MAX_REQUEST_TIMEOUT_MS) throw new Error(`STAGING_API_TIMEOUT_MS must be an integer between 1 and ${MAX_REQUEST_TIMEOUT_MS}.`)
    return configured
}

export function getRetryAttempts(environment = process.env) {
    const configured = Number(environment.STAGING_API_RETRY_ATTEMPTS ?? DEFAULT_RETRY_ATTEMPTS)
    if (!Number.isInteger(configured) || configured < 0 || configured > 5) throw new Error('STAGING_API_RETRY_ATTEMPTS must be an integer between 0 and 5.')
    return configured
}

export function getRetryBackoffMs(environment = process.env) {
    const configured = Number(environment.STAGING_API_RETRY_BACKOFF_MS ?? DEFAULT_RETRY_BACKOFF_MS)
    if (!Number.isInteger(configured) || configured < 0 || configured > 5_000) throw new Error('STAGING_API_RETRY_BACKOFF_MS must be an integer between 0 and 5000.')
    return configured
}

export function normalizeStagingDiscoveryQuery(value) {
    const raw = String(value ?? '').trim()
    if (!raw) return STAGING_DISCOVERY_VARIANTS[0]
    if (raw.length > 1_000 || /[\u0000-\u001f\u007f]/.test(raw)) throw new Error('STAGING_DISCOVERY_QUERY contains invalid control characters or is too long.')
    const params = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw)
    return params.toString()
}

export function isTransientStagingStatus(status) {
    return status === 502 || status === 503 || status === 504
}

export function getStagingOpenApiIssues(document) {
    const issues = []
    if (document?.openapi !== '3.1.0') issues.push(`OpenAPI version ${String(document?.openapi ?? 'missing')} does not match 3.1.0.`)
    for (const path of REQUIRED_STAGING_PATHS) if (!document?.paths?.[path]) issues.push(`missing required compatibility path ${path}`)
    return issues
}

export function hasExpectedDiscoveryCachePolicy(cacheControl) {
    return /\bmax-age=5\b/i.test(cacheControl) && /\bstale-while-revalidate=15\b/i.test(cacheControl)
}

export function assertJsonContentType(headers, endpoint) {
    const contentType = headers?.get?.('content-type') ?? ''
    if (!/^application\/(?:json|[^;]+\+json)\b/i.test(contentType)) throw new Error(`Staging ${endpoint} response must be JSON (received ${contentType || 'none'}).`)
}

export function assertStagingSecurityHeaders(headers, { requireHsts = false } = {}) {
    if (headers?.get?.('x-content-type-options')?.toLowerCase() !== 'nosniff') throw new Error('Staging health response is missing x-content-type-options: nosniff.')
    if (requireHsts && !headers?.get?.('strict-transport-security')) throw new Error('Staging health response is missing strict-transport-security.')
}

export function assertStagingCorsOrigin(headers, expectedOrigin) {
    if (!expectedOrigin) return
    if ((headers?.get?.('access-control-allow-origin') ?? '') !== expectedOrigin) throw new Error('Staging CORS policy does not allow the configured origin.')
}

export async function readBoundedJson(response, endpoint, maxBytes = MAX_OPENAPI_RESPONSE_BYTES) {
    const contentLength = Number(response.headers?.get?.('content-length') ?? 0)
    if (Number.isFinite(contentLength) && contentLength > maxBytes) throw new Error(`Staging ${endpoint} response exceeds the ${maxBytes}-byte limit.`)
    const body = await response.text()
    const bytes = Buffer.byteLength(body, 'utf8')
    if (bytes > maxBytes) throw new Error(`Staging ${endpoint} response exceeds the ${maxBytes}-byte limit.`)
    try {
        return { value: JSON.parse(body), bytes, sha256: createHash('sha256').update(body).digest('hex') }
    } catch {
        throw new Error(`Staging ${endpoint} response is not valid JSON.`)
    }
}

async function runLocalChecks({ quiet = false } = {}) {
    const checks = ['check:api-contract', 'check:api-parity', 'check:openapi-shape', 'check:openapi-structure']
    for (const check of checks) await execFileAsync('npm', ['run', check], quiet ? { stdio: 'ignore' } : { stdio: 'inherit' })
}

export async function checkStaging(baseUrl, fetchImpl = fetch, timeoutMs = getRequestTimeoutMs(), options = {}) {
    const origin = normalizeStagingApiBaseUrl(baseUrl)
    const retryAttempts = options.retryAttempts ?? getRetryAttempts()
    const retryBackoffMs = options.retryBackoffMs ?? getRetryBackoffMs()
    const maxResponseBytes = options.maxResponseBytes ?? MAX_OPENAPI_RESPONSE_BYTES
    const corsOrigin = options.corsOrigin ?? process.env.STAGING_CORS_ORIGIN?.trim() ?? ''
    const requireHsts = options.requireHsts ?? !origin.startsWith('http://')
    const request = async (path) => {
        for (let attempt = 0; attempt <= retryAttempts; attempt += 1) {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), timeoutMs)
            timeout.unref?.()
            try {
                const response = await fetchImpl(`${origin}${path}`, {
                    headers: { accept: 'application/json', ...(corsOrigin ? { origin: corsOrigin } : {}) },
                    credentials: 'omit',
                    signal: controller.signal,
                })
                if (isTransientStagingStatus(response.status) && attempt < retryAttempts) {
                    if (retryBackoffMs > 0) await new Promise((resolveWait) => setTimeout(resolveWait, retryBackoffMs * (attempt + 1)))
                    continue
                }
                return response
            } catch (error) {
                if (error?.name === 'AbortError') {
                    const timeoutError = new Error(`Staging request ${path} timed out after ${timeoutMs} ms.`)
                    timeoutError.code = 'STAGING_TIMEOUT'
                    throw timeoutError
                }
                const networkError = new Error(`Staging request ${path} failed with a network error.`)
                networkError.code = 'STAGING_NETWORK_ERROR'
                throw networkError
            } finally {
                clearTimeout(timeout)
            }
        }
        throw new Error(`Staging request ${path} failed after retries.`)
    }

    const response = await request('/openapi.json')
    if (!response.ok) throw new Error(`Staging OpenAPI request failed with HTTP ${response.status}.`)
    assertJsonContentType(response.headers, 'OpenAPI')
    const openApiPayload = await readBoundedJson(response, 'OpenAPI', maxResponseBytes)
    const openApiIssues = getStagingOpenApiIssues(openApiPayload.value)
    if (openApiIssues.length > 0) throw new Error(`Staging OpenAPI compatibility failed: ${openApiIssues.join('; ')}.`)

    const health = await request('/health/live')
    if (!health.ok) throw new Error(`Staging liveness check failed with HTTP ${health.status}.`)
    assertJsonContentType(health.headers, 'health')
    assertStagingSecurityHeaders(health.headers, { requireHsts })
    assertStagingCorsOrigin(health.headers, corsOrigin)

    const configuredQuery = process.env.STAGING_DISCOVERY_QUERY?.trim()
    const discoveryQueries = configuredQuery ? [normalizeStagingDiscoveryQuery(configuredQuery)] : STAGING_DISCOVERY_VARIANTS
    const discoveryResults = []
    for (const discoveryQuery of discoveryQueries) {
        const discovery = await request(`/v1/discovery/providers?${discoveryQuery}`)
        if (!discovery.ok) throw new Error(`Staging discovery compatibility check failed with HTTP ${discovery.status}.`)
        assertJsonContentType(discovery.headers, 'discovery')
        assertStagingCorsOrigin(discovery.headers, corsOrigin)
        const payload = await readBoundedJson(discovery, 'discovery', maxResponseBytes)
        const cacheControl = discovery.headers.get('cache-control') ?? ''
        if (!hasExpectedDiscoveryCachePolicy(cacheControl)) throw new Error(`Staging discovery response is missing the expected cache policy. Received: ${cacheControl || 'none'}.`)
        discoveryResults.push({ query: discoveryQuery, bytes: payload.bytes, cacheControl })
    }
    return { status: 'pass', origin, openApiSha256: openApiPayload.sha256, openApiBytes: openApiPayload.bytes, discoveryVariants: discoveryResults }
}

export async function runStagingCompatibility({ json = false } = {}) {
    await runLocalChecks({ quiet: json })
    const stagingApiBaseUrl = process.env.STAGING_API_BASE_URL?.trim()
    const requireStagingApi = process.env.REQUIRE_STAGING_API === 'true'
    if (stagingApiBaseUrl) {
        const report = await checkStaging(stagingApiBaseUrl)
        if (!json) console.log(`Staging API compatibility passed for ${report.origin}. OpenAPI sha256=${report.openApiSha256}.`)
        return report
    }
    if (requireStagingApi) throw new Error('REQUIRE_STAGING_API=true requires a non-empty STAGING_API_BASE_URL.')
    const report = { status: 'skipped', reason: 'STAGING_API_BASE_URL is not set', localChecks: 'pass' }
    if (!json) console.log('STAGING_API_BASE_URL is not set; external staging probe was skipped. Local parity checks passed.')
    return report
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const json = process.argv.includes('--json')
    try {
        const report = await runStagingCompatibility({ json })
        if (json) console.log(JSON.stringify(report))
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (json) console.error(JSON.stringify({ status: 'blocked', code: error?.code ?? 'STAGING_COMPATIBILITY_FAILED', message }))
        else console.error(message)
        process.exitCode = 1
    }
}
