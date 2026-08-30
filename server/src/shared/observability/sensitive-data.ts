const SENSITIVE_KEY_PATTERN = /password|token|secret|authorization|cookie|api[_-]?key/i
const PII_KEY_PATTERN = /^(?:email|emailAddress|phone|phoneNumber|telephone|mobile|mobilePhone|vin|vinNumber|licensePlate|registrationNumber|contactSnapshot|vehicleSnapshot|messageBody|issueDescription|symptoms|body|note)$/i
const SENSITIVE_URL_PARAMETER_PATTERN = /([?&](?:token|access_token|refresh_token|id_token|code|state)=)[^&#\s"'<>]+/gi
const SENSITIVE_BEARER_PATTERN = /(\bBearer\s+)[A-Za-z0-9._~+/=-]+/gi
const PII_EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const PII_PHONE_PATTERN = /(?:\+\d[\d\s().-]{8,}\d|\(\d{3}\)\s?\d{3}[\s.-]\d{2,4}[\s.-]?\d{2,4})/g
const PII_VIN_PATTERN = /\b[A-HJ-NPR-Z0-9]{17}\b/gi

export function isSensitiveLogKey(key: string) {
    return SENSITIVE_KEY_PATTERN.test(key) || PII_KEY_PATTERN.test(key)
}

export function sanitizeLogString(value: string) {
    return value
        .replace(SENSITIVE_URL_PARAMETER_PATTERN, '$1[REDACTED]')
        .replace(SENSITIVE_BEARER_PATTERN, '$1[REDACTED]')
        .replace(PII_EMAIL_PATTERN, '[REDACTED_EMAIL]')
        .replace(PII_VIN_PATTERN, '[REDACTED_VIN]')
        .replace(PII_PHONE_PATTERN, '[REDACTED_PHONE]')
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
