export function getStartupFailureGuidance(error: unknown) {
    if (!(error instanceof Error)) return null

    const message = error instanceof AggregateError
        ? [
            error.message,
            ...error.errors
                .filter((cause): cause is Error => cause instanceof Error)
                .map((cause) => cause.message),
        ].filter(Boolean).join('; ')
        : error.message
    if (message.includes('Database schema contract is incomplete:')) {
        return 'Run `npm --prefix server run schema:check`, then `npm --prefix server run release:migrate` before restarting the web process.'
    }

    if (message.includes('ECONNREFUSED') || message.includes('connect EPERM')) {
        return 'Verify that PostgreSQL is reachable and the configured database connection is available.'
    }

    if (
        message.includes('is required in production.')
        || message.includes('requires') && message.includes('in production.')
        || message.includes('must not use a placeholder value in production.')
        || message.includes('Production requires a live Stripe secret key.')
    ) {
        return 'Configure the required production secrets in the deployment environment, then restart the web process. Never place secret values in tracked files.'
    }

    return null
}
