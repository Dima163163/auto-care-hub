const DATABASE_HOST_ENV = [
    'DATABASE_HOST',
    'DATABASE_PORT',
    'DATABASE_USER',
    'DATABASE_PASSWORD',
    'DATABASE_NAME',
]

const REDIS_HOST_ENV = [
    'REDIS_HOST',
    'REDIS_PORT',
]

const REQUIRED_INTEGRATION_ENV = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
]

function isProviderUrl(value, protocols) {
    try {
        const parsed = new URL(String(value ?? '').trim())
        return protocols.has(parsed.protocol) && Boolean(parsed.hostname)
    } catch {
        return false
    }
}

export function getMissingIntegrationPrerequisites(environment = process.env) {
    const missing = REQUIRED_INTEGRATION_ENV.filter((name) => !String(environment[name] ?? '').trim())
    const hasDatabaseUrl = isProviderUrl(environment.DATABASE_URL, new Set(['postgres:', 'postgresql:']))
    const hasDatabaseHostConfig = DATABASE_HOST_ENV.every((name) => String(environment[name] ?? '').trim())
    if (!hasDatabaseUrl && !hasDatabaseHostConfig) {
        missing.unshift('DATABASE_URL or DATABASE_HOST/DATABASE_PORT/DATABASE_USER/DATABASE_PASSWORD/DATABASE_NAME')
    }

    const hasRedisUrl = isProviderUrl(environment.REDIS_URL, new Set(['redis:', 'rediss:']))
    const hasRedisHostConfig = REDIS_HOST_ENV.every((name) => String(environment[name] ?? '').trim())
    if (!hasRedisUrl && !hasRedisHostConfig) {
        missing.unshift('REDIS_URL or REDIS_HOST/REDIS_PORT')
    }

    return missing
}

export function formatIntegrationPrerequisiteFailure(missing) {
    return [
        `Missing integration prerequisites: ${missing.join(', ')}`,
        'Copy server/.env.example to server/.env and fill the required integration values.',
        'For local PostgreSQL and Redis, run: npm run server:db:up',
        'Then rerun: npm run check-integration-prerequisites',
    ].join('\n')
}

if (process.argv[1]?.endsWith('check-integration-prerequisites.mjs')) {
    const missing = getMissingIntegrationPrerequisites()
    if (missing.length > 0) {
        console.error(formatIntegrationPrerequisiteFailure(missing))
        process.exitCode = 1
    } else {
        console.log('Integration prerequisites are configured.')
    }
}
