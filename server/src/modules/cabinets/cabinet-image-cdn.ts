import { assertSafeCabinetImageObjectKey } from './cabinet-image-storage-provider.js'
import {
    getCabinetImageVariantKey,
    type CabinetImageVariant,
} from './cabinet-image-variants.js'

export function buildCabinetImageCdnUrl(input: {
    origin: string
    key: string
    variant?: CabinetImageVariant
}) {
    const key = input.variant
        ? getCabinetImageVariantKey(input.key, input.variant)
        : input.key
    assertSafeCabinetImageObjectKey(key)

    const origin = new URL(input.origin)
    if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) {
        throw new Error('Invalid cabinet image CDN origin.')
    }

    return new URL(`/uploads/cabinets/${key}`, origin).toString()
}
