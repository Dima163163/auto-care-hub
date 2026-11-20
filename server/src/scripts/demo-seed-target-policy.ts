interface DemoSeedTarget {
    nodeEnv: 'development' | 'test' | 'production'
    host: string
    name: string
    port: number
    url: string | null
    username: string
}

const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]', '::1'])
const disposableDatabaseName = /^[a-z][a-z0-9_]*_(?:test|e2e|disposable)(?:_[a-z0-9]+)?$/
const productionName = /(?:^|_)(?:prod|production|stage|staging)(?:_|$)/i

export function getDemoSeedTargetError(target: DemoSeedTarget): string | null {
    if (target.nodeEnv === 'production') return 'Demo seeding is disabled in production.'
    if (!loopbackHosts.has(target.host) || target.url && new URL(target.url).search) {
        return 'Demo seeding requires loopback PostgreSQL without connection URL parameters.'
    }

    // Keep the database used by the existing local Docker Compose working.
    const localComposeDatabase = target.nodeEnv === 'development'
        && target.port === 5433 && target.username === 'autocarehub' && target.name === 'autocarehub'
    if (productionName.test(target.name) || !localComposeDatabase && !disposableDatabaseName.test(target.name)) {
        return 'Demo seeding requires the local Compose database or a disposable database named *_test, *_e2e, or *_disposable.'
    }
    return null
}
