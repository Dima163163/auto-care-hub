import { randomUUID } from 'node:crypto'

import { env } from '../../config/env.js'
import { logError } from '../../shared/observability/logger.js'
import {
    assertSafeCabinetImageObjectKey,
    type CabinetImageStorageProvider,
} from './cabinet-image-storage-provider.js'
import { FileSystemCabinetImageStorage } from './filesystem-cabinet-image-storage.js'
import {
    isOrphanImageEntryOlderThan,
    selectOrphanImageEntries,
} from './orphan-image-scan.js'
import {
    MAX_CABINET_IMAGE_METADATA_BYTES,
    serializeCabinetImageMetadata,
} from './cabinet-image-metadata.js'
import { createCabinetImagePreview, createCabinetImageThumbnail } from './cabinet-image-thumbnail.js'
import { getCabinetImageManifest } from './cabinet-image-manifest.js'
import { assertCabinetImageStorageProviderAvailable } from './storage-provider-policy.js'
import { boundCabinetImageDeleteBatch } from './image-delete-policy.js'
import { getCabinetImageVariantKey } from './cabinet-image-variants.js'
import { getCabinetImageChecksum } from './cabinet-image-integrity.js'
import { readCabinetImageDimensions } from './cabinet-image-dimensions.js'
import type { StoredCabinetImageManifest, StoredCabinetImageVariant } from './cabinet-image-manifest.js'
import {
    deleteCabinetImageManifest,
    getCabinetImageManifestMap,
    saveCabinetImageManifest,
} from './cabinet-image-manifest-store.js'

const LEGACY_IMAGE_REGISTRATION_BATCH = 8

export const CABINET_UPLOADS_DIR = env.cabinetUploadsDir

export const cabinetImageStorage = new FileSystemCabinetImageStorage(CABINET_UPLOADS_DIR)
assertCabinetImageStorageProviderAvailable(env.cabinetImageStorageProvider)

export const imageContentTypesByExtension = {
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
} as const

const uploadedCabinetImagePathPattern =
    /^\/uploads\/cabinets\/([a-f0-9-]+(?:-(?:thumb|preview))?\.(jpg|png|webp))$/

type CabinetImageMimeType =
    | 'image/jpeg'
    | 'image/png'
    | 'image/webp'

export async function createStoredCabinetImageManifest(input: {
    originalKey: string
    originalContentType: CabinetImageMimeType
    originalContent: Buffer
    thumbnailKey: string
    thumbnailContent: Buffer
    previewKey: string
    previewContent: Buffer
}): Promise<StoredCabinetImageManifest> {
    const createVariantMetadata = async (
        key: string,
        content: Buffer,
    ): Promise<StoredCabinetImageVariant> => {
        const dimensions = await readCabinetImageDimensions(content)
        return {
            key,
            contentType: 'image/webp',
            bytes: content.length,
            width: dimensions.width,
            height: dimensions.height,
            checksum: getCabinetImageChecksum(content),
        }
    }
    const originalDimensions = await readCabinetImageDimensions(input.originalContent)
    const checksum = getCabinetImageChecksum(input.originalContent)

    return {
        originalKey: input.originalKey,
        version: checksum,
        original: {
            key: input.originalKey,
            contentType: input.originalContentType,
            bytes: input.originalContent.length,
            width: originalDimensions.width,
            height: originalDimensions.height,
            checksum,
        },
        variants: {
            thumbnail: await createVariantMetadata(input.thumbnailKey, input.thumbnailContent),
            preview: await createVariantMetadata(input.previewKey, input.previewContent),
        },
    }
}

function getImageExtension(mimeType: CabinetImageMimeType) {
    if (mimeType === 'image/jpeg') {
        return 'jpg'
    }

    if (mimeType === 'image/png') {
        return 'png'
    }

    return 'webp'
}

export function assertSafeImageFileName(fileName: string) {
    assertSafeCabinetImageObjectKey(fileName)
}

export function getUploadedCabinetImageFileName(photoUrl: string) {
    return uploadedCabinetImagePathPattern.exec(photoUrl)?.[1]
}

export function createCabinetImageReadStream(fileName: string) {
    return cabinetImageStorage.createReadStream(fileName)
}

async function readCabinetImageContent(fileName: string) {
    const chunks: Buffer[] = []
    let bytes = 0

    for await (const chunk of createCabinetImageReadStream(fileName)) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        bytes += buffer.length
        if (bytes > MAX_CABINET_IMAGE_METADATA_BYTES) {
            throw new Error('Legacy cabinet image exceeds the accepted size limit.')
        }
        chunks.push(buffer)
    }

    if (bytes === 0) {
        throw new Error('Legacy cabinet image is empty.')
    }

    return Buffer.concat(chunks, bytes)
}

export async function createCabinetImageManifestFromOriginal(input: {
    originalKey: string
    originalContentType: CabinetImageMimeType
    originalContent: Buffer
}) {
    const manifest = getCabinetImageManifest(input.originalKey)
    const thumbnail = await createCabinetImageThumbnail(input.originalContent)
    const preview = await createCabinetImagePreview(input.originalContent)
    const storedManifest = await createStoredCabinetImageManifest({
        originalKey: input.originalKey,
        originalContentType: input.originalContentType,
        originalContent: input.originalContent,
        thumbnailKey: manifest.variants.thumbnail,
        thumbnailContent: thumbnail,
        previewKey: manifest.variants.preview,
        previewContent: preview,
    })

    return { storedManifest, thumbnail, preview }
}

async function registerLegacyCabinetImageManifest(originalKey: string) {
    const extension = originalKey.split('.').at(-1) as keyof typeof imageContentTypesByExtension
    const originalContent = await readCabinetImageContent(originalKey)
    const generated = await createCabinetImageManifestFromOriginal({
        originalKey,
        originalContentType: imageContentTypesByExtension[extension],
        originalContent,
    })
    const objects = [
        { key: generated.storedManifest.variants.thumbnail.key, content: generated.thumbnail },
        { key: generated.storedManifest.variants.preview.key, content: generated.preview },
    ]

    try {
        await putCabinetImageObjects(cabinetImageStorage, objects)
        await saveCabinetImageManifest(generated.storedManifest)
    } catch (error) {
        await Promise.allSettled(objects.map(({ key }) => cabinetImageStorage.remove(key)))
        throw error
    }

    return generated.storedManifest
}

export async function ensureCabinetImageManifests(photoUrls: string[]) {
    const manifests = await getCabinetImageManifestMap(photoUrls)
    const missingKeys = [...new Set(
        photoUrls
            .map(getUploadedCabinetImageFileName)
            .filter((fileName): fileName is string => Boolean(fileName)),
    )]
        .filter((originalKey) => !manifests.has(originalKey))
        .slice(0, LEGACY_IMAGE_REGISTRATION_BATCH)

    const results = await Promise.allSettled(
        missingKeys.map(async (originalKey) => ({
            originalKey,
            manifest: await registerLegacyCabinetImageManifest(originalKey),
        })),
    )

    for (const result of results) {
        if (result.status === 'fulfilled') {
            manifests.set(result.value.originalKey, result.value.manifest)
            continue
        }

        logError('Failed to register legacy cabinet image manifest', result.reason, {
            operation: 'cabinet-image-legacy-registration',
        })
    }

    return manifests
}

export async function putCabinetImageObjects(
    storage: Pick<CabinetImageStorageProvider, 'put' | 'remove'>,
    objects: ReadonlyArray<{ key: string; content: Buffer }>,
) {
    const results = await Promise.allSettled(
        objects.map(({ key, content }) => storage.put(key, content)),
    )
    const failure = results.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
    )

    if (!failure) return

    const cleanupResults = await Promise.allSettled(
        objects.map(({ key }) => storage.remove(key)),
    )
    cleanupResults.forEach((result) => {
        if (result.status === 'rejected') {
            logError('Failed to roll back cabinet image object', result.reason, {
                operation: 'cabinet-image-upload-rollback',
            })
        }
    })

    throw failure.reason
}

export async function saveCabinetImage(input: {
    content: Buffer
    mimeType: CabinetImageMimeType
}) {
    const fileName = `${randomUUID()}.${getImageExtension(input.mimeType)}`
    const metadata = serializeCabinetImageMetadata({
        key: fileName,
        contentType: input.mimeType,
        bytes: input.content.length,
    })
    const generated = await createCabinetImageManifestFromOriginal({
        originalKey: metadata.key,
        originalContentType: input.mimeType,
        originalContent: input.content,
    })
    const objects = [
        { key: metadata.key, content: input.content },
        { key: generated.storedManifest.variants.thumbnail.key, content: generated.thumbnail },
        { key: generated.storedManifest.variants.preview.key, content: generated.preview },
    ]

    try {
        await putCabinetImageObjects(cabinetImageStorage, objects)
        await saveCabinetImageManifest(generated.storedManifest)
    } catch (error) {
        await Promise.allSettled(objects.map(({ key }) => cabinetImageStorage.remove(key)))
        throw error
    }

    return `/uploads/cabinets/${fileName}`
}

export async function deleteUploadedCabinetImages(photoUrls: string[]) {
    const fileNames = boundCabinetImageDeleteBatch(
        photoUrls
            .map(getUploadedCabinetImageFileName)
            .filter((fileName): fileName is string => Boolean(fileName))
    )

    const objectKeys = fileNames.flatMap((fileName) => [
        fileName,
        getCabinetImageVariantKey(fileName, 'thumbnail'),
        getCabinetImageVariantKey(fileName, 'preview'),
    ])

    await Promise.all(objectKeys.map((objectKey) => cabinetImageStorage.remove(objectKey)))
    await Promise.all(fileNames.map((fileName) => deleteCabinetImageManifest(fileName)))
}

export async function cleanupOrphanedCabinetImages(input: {
    referencedPhotoUrls: string[]
    now?: Date
    gracePeriodMs: number
}) {
    const entries = selectOrphanImageEntries(await cabinetImageStorage.list())

    const referencedFileNames = new Set(
        input.referencedPhotoUrls
            .map(getUploadedCabinetImageFileName)
            .filter((fileName): fileName is string => Boolean(fileName))
            .flatMap((fileName) => [
                fileName,
                getCabinetImageVariantKey(fileName, 'thumbnail'),
                getCabinetImageVariantKey(fileName, 'preview'),
            ])
    )
    const now = (input.now ?? new Date()).getTime()
    let scanned = 0
    let removed = 0
    let failed = 0

    for (const entry of entries) {
        if (referencedFileNames.has(entry.key)) continue

        const fileName = getUploadedCabinetImageFileName(`/uploads/cabinets/${entry.key}`)
        if (!fileName) continue

        if (!isOrphanImageEntryOlderThan(entry.lastModifiedAt, now, input.gracePeriodMs)) continue

        scanned += 1
        try {
            await cabinetImageStorage.remove(fileName)
            if (!/-thumb\.webp$|-preview\.webp$/i.test(fileName)) {
                await deleteCabinetImageManifest(fileName)
            }
            removed += 1
        } catch (error) {
            failed += 1
            logError('Failed to remove orphaned cabinet image', error, {
                operation: 'orphan-image-remove',
            })
        }
    }

    return { scanned, removed, failed }
}

export function getRemovedUploadedCabinetImages(
    previousPhotoUrls: string[],
    nextPhotoUrls: string[]
) {
    const nextUploadedFileNames = new Set(
        nextPhotoUrls
            .map(getUploadedCabinetImageFileName)
            .filter((fileName): fileName is string => Boolean(fileName))
    )

    return previousPhotoUrls.filter((photoUrl) => {
        const fileName = getUploadedCabinetImageFileName(photoUrl)

        return Boolean(fileName && !nextUploadedFileNames.has(fileName))
    })
}
