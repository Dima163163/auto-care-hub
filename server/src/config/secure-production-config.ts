type NodeEnvironment = 'development' | 'test' | 'production'

export function getDefaultBindHost(nodeEnv: NodeEnvironment) {
    return nodeEnv === 'production' ? '0.0.0.0' : '127.0.0.1'
}

export function assertProductionDatabaseTlsPolicy(nodeEnv: NodeEnvironment, rejectUnauthorized: boolean) {
    if (nodeEnv === 'production' && !rejectUnauthorized) {
        throw new Error('DATABASE_SSL_REJECT_UNAUTHORIZED must be true in production.')
    }
}

export function assertProductionJwtSecretPolicy(input: {
    nodeEnv: NodeEnvironment
    accessSecret?: string
    refreshSecret?: string
}) {
    if (input.nodeEnv !== 'production') return

    const { accessSecret, refreshSecret } = input
    if (!accessSecret || !refreshSecret) {
        throw new Error('Production requires separate JWT_ACCESS_SECRET and JWT_REFRESH_SECRET values.')
    }
    if (accessSecret.length < 32 || refreshSecret.length < 32) {
        throw new Error('Production JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must each be at least 32 characters.')
    }
    if (accessSecret === refreshSecret) {
        throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different in production.')
    }
}
