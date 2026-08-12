import { assertSafeCabinetImageObjectKey } from './cabinet-image-storage-provider.js'

export const MAX_CABINET_IMAGE_METADATA_BYTES = 1_048_576

const supportedImageContentTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
])

export function serializeCabinetImageMetadata(input: {
    key: string
    contentType: string
    bytes: number
}) {
    assertSafeCabinetImageObjectKey(input.key)

    if (!supportedImageContentTypes.has(input.contentType)) {
        throw new Error('Unsupported cabinet image content type.')
    }

    if (!Number.isSafeInteger(input.bytes) || input.bytes < 1 || input.bytes > MAX_CABINET_IMAGE_METADATA_BYTES) {
        throw new Error('Cabinet image byte length is outside the accepted bounds.')
    }

    return {
        key: input.key,
        contentType: input.contentType,
        bytes: input.bytes,
    }
}
