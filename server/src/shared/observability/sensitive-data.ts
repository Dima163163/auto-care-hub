const SENSITIVE_KEY_PATTERN = /password|token|secret|authorization|cookie|api[_-]?key/i
const PII_KEY_PATTERN = /^(?:email|emailAddress|phone|phoneNumber|telephone|mobile|mobilePhone|vin|vinNumber|licensePlate|registrationNumber|contactSnapshot|vehicleSnapshot|messageBody|issueDescription|symptoms|body|note)$/i
const SENSITIVE_URL_PARAMETER_PATTERN = /([?&](?:token|access_token|refresh_token|id_token|code|state)=)[^&#\s"'<>]+/gi
const SENSITIVE_BEARER_PATTERN = /(\bBearer\s+)[A-Za-z0-9._~+/=-]+/gi

export function isSensitiveLogKey(key: string) {
    return SENSITIVE_KEY_PATTERN.test(key) || PII_KEY_PATTERN.test(key)
}

function sanitizeLogString(value: string) {
    return value
        .replace(SENSITIVE_URL_PARAMETER_PATTERN, '$1[REDACTED]')
        .replace(SENSITIVE_BEARER_PATTERN, '$1[REDACTED]')
}

export function sanitizeLogMetadata(
    metadata: Record<string, unknown>,
): Record<string, unknown> {
    const sanitizeValue = (value: unknown, depth: number): unknown => {
        if (depth > 5) return '[REDACTED_DEPTH]'
        if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, depth + 1))
        if (typeof value === 'string') return sanitizeLogString(value)
        if (!value || typeof value !== 'object') return value

        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [
                key,
                isSensitiveLogKey(key)
                    ? '[REDACTED]'
                    : sanitizeValue(nestedValue, depth + 1),
            ]),
        )
    }

    return sanitizeValue(metadata, 0) as Record<string, unknown>
}
