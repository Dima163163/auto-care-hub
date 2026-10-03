type IntegrationEnvironment = {
    NODE_ENV?: string
    TEST_DATABASE_URL?: string
    TEST_REDIS_URL?: string
}

function parseLocalTarget(value: string | undefined, name: string, protocols: string[]) {
    if (!value?.trim()) throw new Error(`${name} must explicitly select a disposable local test service.`)

    let target: URL
    try {
        target = new URL(value)
    } catch {
        throw new Error(`${name} must be a valid test connection URL.`)
    }

    if (!protocols.includes(target.protocol)
        || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
        || target.search || target.hash) {
        throw new Error(`${name} must use a loopback host and have no query or fragment.`)
    }

    return target
}

export function resolveIntegrationTargets(environment: IntegrationEnvironment) {
    if (environment.NODE_ENV !== 'test') {
        throw new Error('Database integration suites require NODE_ENV=test.')
    }

    const database = parseLocalTarget(environment.TEST_DATABASE_URL, 'TEST_DATABASE_URL', ['postgres:', 'postgresql:'])
    let databaseName: string
    try {
        databaseName = decodeURIComponent(database.pathname.slice(1))
    } catch {
        throw new Error('TEST_DATABASE_URL has an invalid database name.')
    }
    if (!/^[a-z][a-z0-9_]*_test(?:_[a-z0-9]+)?$/.test(databaseName)
        || /(?:^|_)(?:prod|production)(?:_|$)/.test(databaseName)) {
        throw new Error('TEST_DATABASE_URL must name a disposable database ending in _test or _test_<id>.')
    }

    const redis = parseLocalTarget(environment.TEST_REDIS_URL, 'TEST_REDIS_URL', ['redis:', 'rediss:'])
    if (!/^\/(?:[1-9]|1[0-5])$/.test(redis.pathname)) {
        throw new Error('TEST_REDIS_URL must explicitly select a disposable Redis database from 1 to 15.')
    }

    return { databaseUrl: database.toString(), redisUrl: redis.toString() }
}
