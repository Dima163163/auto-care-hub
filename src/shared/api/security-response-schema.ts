function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function getNonEmptyStringField(value: unknown, field: string): string | null {
    if (!isRecord(value) || !(field in value)) {
        return null
    }

    const fieldValue = value[field]

    return typeof fieldValue === 'string' && fieldValue.length > 0
        ? fieldValue
        : null
}

export function parseAccessTokenResponse(value: unknown): string | null {
    return getNonEmptyStringField(value, 'accessToken')
}

export function parseCsrfTokenResponse(value: unknown): string | null {
    return getNonEmptyStringField(value, 'csrfToken')
}
