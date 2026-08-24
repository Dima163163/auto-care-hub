const SENSITIVE_AUDIT_KEY_PATTERN = /^(?:authorization|cookie|email|emailAddress|phone|phoneNumber|telephone|mobile|mobilePhone|vin|vinNumber|licensePlate|registrationNumber|password|passwordHash|refreshToken|token|accessToken|secret|contactSnapshot|vehicleSnapshot|messageBody|issueDescription|symptoms|body|note)$/i

const REDACTED_VALUE = '[REDACTED]'

function redactValue(value: unknown, depth: number): unknown {
    if (depth > 4 || value === null || typeof value !== 'object') return value
    if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1))

    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
            key,
            SENSITIVE_AUDIT_KEY_PATTERN.test(key) ? REDACTED_VALUE : redactValue(item, depth + 1),
        ]),
    )
}

export function redactAuditMetadata(metadata: Record<string, unknown>) {
    return redactValue(metadata, 0) as Record<string, unknown>
}
