import { assertSafeCabinetImageObjectKey } from './cabinet-image-storage-provider.js'

export const CABINET_IMAGE_VARIANTS = ['thumbnail', 'preview'] as const
export type CabinetImageVariant = (typeof CABINET_IMAGE_VARIANTS)[number]

const VARIANT_SUFFIXES: Record<CabinetImageVariant, string> = {
    thumbnail: 'thumb',
    preview: 'preview',
}

export function getCabinetImageVariantKey(
    originalKey: string,
    variant: CabinetImageVariant,
) {
    assertSafeCabinetImageObjectKey(originalKey)
    const extensionIndex = originalKey.lastIndexOf('.')
    const stem = originalKey.slice(0, extensionIndex)

    // Variants are always encoded as WebP, so their key and response MIME type
    // stay aligned regardless of the uploaded source format.
    return `${stem}-${VARIANT_SUFFIXES[variant]}.webp`
}
