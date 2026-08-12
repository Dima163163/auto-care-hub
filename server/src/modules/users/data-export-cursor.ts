export function encodeDataExportCursor(input: { createdAt: string; id: string }) {
    const payload = JSON.stringify(input)
    return Buffer.from(payload, 'utf8').toString('base64url')
}

export function decodeDataExportCursor(value: string) {
    if (value.length < 1 || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) {
        throw new Error('Data export cursor is invalid.')
    }

    let parsed: unknown
    try {
        parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    } catch {
        throw new Error('Data export cursor is invalid.')
    }

    if (!parsed || typeof parsed !== 'object' || typeof (parsed as { createdAt?: unknown }).createdAt !== 'string' || typeof (parsed as { id?: unknown }).id !== 'string') {
        throw new Error('Data export cursor is invalid.')
    }
    return parsed as { createdAt: string; id: string }
}
