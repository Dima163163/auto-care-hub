export function isJsonContentType(value: string | undefined) {
    if (!value) return false
    const mediaType = value.split(';', 1)[0]?.trim().toLowerCase()
    return mediaType === 'application/json' || mediaType?.endsWith('+json') === true
}

export function assertJsonContentType(value: string | undefined, hasBody: boolean) {
    if (hasBody && !isJsonContentType(value)) {
        throw new Error('JSON content type is required.')
    }
}
