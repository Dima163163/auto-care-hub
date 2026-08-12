import { z } from 'zod'

import { assertSafeCabinetImageObjectKey } from './cabinet-image-storage-provider.js'
import { getCabinetImageVariantKey, type CabinetImageVariant } from './cabinet-image-variants.js'

export type StoredCabinetImageVariant = {
    key: string
    contentType: string
    bytes: number
    width: number
    height: number
    checksum: string
}

export type StoredCabinetImageManifest = {
    originalKey: string
    version: string
    original: StoredCabinetImageVariant
    variants: Record<CabinetImageVariant, StoredCabinetImageVariant>
}

const cabinetImageKeyPattern = /^[a-f0-9-]+(?:-(?:thumb|preview))?\.(?:jpg|png|webp)$/
const cabinetImageChecksumPattern = /^[a-f0-9]{64}$/
const cabinetImageContentTypes = ['image/jpeg', 'image/png', 'image/webp'] as const

const storedCabinetImageVariantSchema = z.object({
    key: z.string().regex(cabinetImageKeyPattern),
    contentType: z.enum(cabinetImageContentTypes),
    bytes: z.number().int().min(1).max(1_048_576),
    width: z.number().int().min(1).max(4_096),
    height: z.number().int().min(1).max(4_096),
    checksum: z.string().regex(cabinetImageChecksumPattern),
}).strict()

const storedCabinetImageManifestSchema = z.object({
    originalKey: z.string().regex(cabinetImageKeyPattern),
    version: z.string().min(1).max(128),
    original: storedCabinetImageVariantSchema,
    variants: z.object({
        thumbnail: storedCabinetImageVariantSchema,
        preview: storedCabinetImageVariantSchema,
    }).strict(),
}).strict().superRefine((manifest, context) => {
    if (manifest.original.key !== manifest.originalKey) {
        context.addIssue({
            code: 'custom',
            path: ['original', 'key'],
            message: 'Original manifest key must match originalKey.',
        })
    }

    for (const variant of ['thumbnail', 'preview'] as const) {
        if (manifest.variants[variant].key !== getCabinetImageVariantKey(manifest.originalKey, variant)) {
            context.addIssue({
                code: 'custom',
                path: ['variants', variant, 'key'],
                message: 'Derived manifest key does not match the original key.',
            })
        }
    }
})

export function parseStoredCabinetImageManifest(input: unknown) {
    const result = storedCabinetImageManifestSchema.safeParse(input)
    if (!result.success) return null

    try {
        assertSafeCabinetImageObjectKey(result.data.originalKey)
        Object.values(result.data.variants).forEach((variant) => {
            assertSafeCabinetImageObjectKey(variant.key)
        })
    } catch {
        return null
    }

    return result.data
}

export function getCabinetImageManifest(originalKey: string) {
    assertSafeCabinetImageObjectKey(originalKey)
    const variants = ['thumbnail', 'preview'] as const

    return {
        originalKey,
        // Uploaded object keys are UUID-backed and immutable, so they are a
        // stable cache version until the asset is replaced.
        version: originalKey,
        variants: Object.fromEntries(
            variants.map((variant) => [variant, getCabinetImageVariantKey(originalKey, variant)]),
        ) as Record<CabinetImageVariant, string>,
    }
}
