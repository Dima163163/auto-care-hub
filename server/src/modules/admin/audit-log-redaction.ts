const SENSITIVE_AUDIT_KEYS = new Set([
    'authorization',
    'cookie',
    'email',
    'password',
    'passwordHash',
    'refreshToken',
    'token',
    'accessToken',
    'secret',
])

const REDACTED_VALUE = '[REDACTED]'

function redactValue(value: unknown, depth: number): unknown {
    if (depth > 4 || value === null || typeof value !== 'object') return value
    if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1))

    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
            key,
            SENSITIVE_AUDIT_KEYS.has(key) ? REDACTED_VALUE : redactValue(item, depth + 1),
        ]),
    )
}

export function redactAuditMetadata(metadata: Record<string, unknown>) {
    return redactValue(metadata, 0) as Record<string, unknown>
}
