export const SUPPORTED_IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
] as const

export type SupportedImageMimeType = typeof SUPPORTED_IMAGE_MIME_TYPES[number]

export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024

export function isSupportedImageMimeType(value: string): value is SupportedImageMimeType {
    return (SUPPORTED_IMAGE_MIME_TYPES as readonly string[]).includes(value)
}

export function getSupportedImageMimeType(file: File): SupportedImageMimeType | undefined {
    return isSupportedImageMimeType(file.type) && file.size <= MAX_IMAGE_UPLOAD_BYTES
        ? file.type
        : undefined
}

export function validateImageUpload(file: File) {
    const contentType = getSupportedImageMimeType(file)

    if (!contentType) {
        return {
            isValid: false as const,
            reason: file.size > MAX_IMAGE_UPLOAD_BYTES
                ? 'imageTooLarge' as const
                : 'imageTypeNotSupported' as const,
        }
    }

    return { isValid: true as const, contentType }
}
