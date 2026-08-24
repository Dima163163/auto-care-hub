import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

async function runLocalChecks() {
    const checks = ['check:api-contract', 'check:api-parity', 'check:openapi-shape', 'check:openapi-structure']
    for (const check of checks) await execFileAsync('npm', ['run', check], { stdio: 'inherit' })
}

async function checkStaging(baseUrl) {
    const origin = baseUrl.replace(/\/$/, '')
    const response = await fetch(`${origin}/openapi.json`, { headers: { accept: 'application/json' } })
    if (!response.ok) throw new Error(`Staging OpenAPI request failed with HTTP ${response.status}.`)
    const document = await response.json()
    if (document.openapi !== '3.1.0') throw new Error(`Staging OpenAPI version ${String(document.openapi)} does not match 3.1.0.`)
    for (const path of ['/health/live', '/health/ready', '/v1/markets', '/v1/discovery', '/openapi.json']) {
        if (!document.paths?.[path]) throw new Error(`Staging OpenAPI is missing required compatibility path ${path}.`)
    }
    const health = await fetch(`${origin}/health/live`, { headers: { accept: 'application/json' } })
    if (!health.ok) throw new Error(`Staging liveness check failed with HTTP ${health.status}.`)
    console.log(`Staging API compatibility passed for ${origin}.`)
}

await runLocalChecks()
const stagingApiBaseUrl = process.env.STAGING_API_BASE_URL?.trim()
const requireStagingApi = process.env.REQUIRE_STAGING_API === 'true'

if (stagingApiBaseUrl) await checkStaging(stagingApiBaseUrl)
else if (requireStagingApi) {
    throw new Error('REQUIRE_STAGING_API=true requires a non-empty STAGING_API_BASE_URL.')
} else {
    console.log('STAGING_API_BASE_URL is not set; external staging probe was skipped. Local parity checks passed.')
}
