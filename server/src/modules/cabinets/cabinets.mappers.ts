import type { CabinetEntity } from '../../entities/cabinet/cabinet.entity.js'
import type { StoredCabinetImageManifest } from './cabinet-image-manifest.js'
import type { OwnerCabinet, PublicCabinet } from './cabinets.types.js'

const originalUploadedPhotoPattern = /^\/uploads\/cabinets\/([a-f0-9-]+\.(?:jpg|png|webp))$/i

function getOriginalContentType(fileName: string) {
    const extension = fileName.split('.').at(-1)?.toLowerCase()
    if (extension === 'jpg') return 'image/jpeg'
    if (extension === 'png') return 'image/png'
    if (extension === 'webp') return 'image/webp'
    return null
}

export function toPublicCabinetImageAsset(
    photoUrl: string,
    storedManifest?: StoredCabinetImageManifest,
) {
    const match = originalUploadedPhotoPattern.exec(photoUrl)
    if (!match?.[1] || !storedManifest) {
        return {
            original: {
                url: photoUrl,
                contentType: match?.[1] ? getOriginalContentType(match[1]) : null,
                bytes: null,
                width: null,
                height: null,
                checksum: null,
                version: null,
            },
            fallbackUrl: photoUrl,
        }
    }

    const originalKey = match[1]
    const manifest = storedManifest.originalKey === originalKey
        ? storedManifest
        : undefined

    if (!manifest) {
        return {
            original: {
                url: photoUrl,
                contentType: getOriginalContentType(originalKey),
                bytes: null,
                width: null,
                height: null,
                checksum: null,
                version: null,
            },
            fallbackUrl: photoUrl,
        }
    }

    return {
        original: {
            url: photoUrl,
            contentType: manifest.original.contentType,
            bytes: manifest.original.bytes,
            width: manifest.original.width,
            height: manifest.original.height,
            checksum: manifest.original.checksum,
            version: manifest.version,
        },
        fallbackUrl: photoUrl,
        thumbnail: {
            url: `/uploads/cabinets/${manifest.variants.thumbnail.key}`,
            contentType: manifest.variants.thumbnail.contentType,
            bytes: manifest.variants.thumbnail.bytes,
            width: manifest.variants.thumbnail.width,
            height: manifest.variants.thumbnail.height,
            checksum: manifest.variants.thumbnail.checksum,
            version: manifest.version,
        },
        preview: {
            url: `/uploads/cabinets/${manifest.variants.preview.key}`,
            contentType: manifest.variants.preview.contentType,
            bytes: manifest.variants.preview.bytes,
            width: manifest.variants.preview.width,
            height: manifest.variants.preview.height,
            checksum: manifest.variants.preview.checksum,
            version: manifest.version,
        },
    }
}

export function toPublicCabinet(
    cabinet: CabinetEntity,
    availabilityPreview: PublicCabinet['availabilityPreview'] = null,
    imageManifests?: ReadonlyMap<string, StoredCabinetImageManifest>,
): PublicCabinet {
    return {
        id: cabinet.id,
        ownerId: cabinet.ownerId,
        title: cabinet.title,
        description: cabinet.description,
        address: cabinet.address,
        city: cabinet.city,
        timezone: cabinet.timezone,
        pricePerHour: cabinet.pricePerHour,
        status: cabinet.status,
        photos: cabinet.photos,
        photoAssets: cabinet.photos.map((photoUrl) => {
            const originalKey = originalUploadedPhotoPattern.exec(photoUrl)?.[1]
            return toPublicCabinetImageAsset(photoUrl, originalKey ? imageManifests?.get(originalKey) : undefined)
        }),
        amenities: cabinet.amenities,
        cancellationPolicy: cabinet.cancellationPolicy,
        houseRules: cabinet.houseRules,
        createdAt: cabinet.createdAt,
        availabilityPreview,
    }
}

export function toOwnerCabinet(
    cabinet: CabinetEntity,
    imageManifests?: ReadonlyMap<string, StoredCabinetImageManifest>,
): OwnerCabinet {
    return toPublicCabinet(cabinet, null, imageManifests)
}
