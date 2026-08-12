export const CABINET_IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable'

export function mapCabinetImageResponse(input: {
    url: string
    contentType: string
    bytes: number
    checksum?: string
    width?: number
    height?: number
}) {
    return {
        url: input.url,
        contentType: input.contentType,
        bytes: input.bytes,
        checksum: input.checksum ?? null,
        dimensions: input.width && input.height
            ? { width: input.width, height: input.height }
            : null,
    }
}
