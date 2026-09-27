type DemoResetTarget = {
    nodeEnv: 'development' | 'test' | 'production'
    configuredDatabaseName: string
    connectedDatabaseName: string
    confirmation: string | undefined
}

const DISPOSABLE_DATABASE_SUFFIX = /(?:_test|_e2e|_disposable)$/i

export function getDemoResetTargetError(target: DemoResetTarget): string | null {
    if (target.nodeEnv === 'production') {
        return 'Demo data reset is disabled in production.'
    }

    if (!target.connectedDatabaseName || target.connectedDatabaseName !== target.configuredDatabaseName) {
        return 'Demo data reset refused because the connected database does not match the configured database.'
    }

    if (!DISPOSABLE_DATABASE_SUFFIX.test(target.connectedDatabaseName)) {
        return 'Demo data reset requires a disposable database name ending in _test, _e2e, or _disposable.'
    }

    if (target.confirmation !== target.connectedDatabaseName) {
        return 'Demo data reset requires DEMO_RESET_CONFIRM_DATABASE to exactly match the disposable database name.'
    }

    return null
}
