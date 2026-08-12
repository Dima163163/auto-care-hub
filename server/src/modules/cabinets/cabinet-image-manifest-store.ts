import { In } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import { CabinetImageManifestEntity } from '../../entities/cabinet-image/cabinet-image-manifest.entity.js'
import { logWarn } from '../../shared/observability/logger.js'
import { parseStoredCabinetImageManifest, type StoredCabinetImageManifest } from './cabinet-image-manifest.js'

const uploadedCabinetImagePathPattern = /^\/uploads\/cabinets\/([a-f0-9-]+\.(?:jpg|png|webp))$/i

function getOriginalKey(photoUrl: string) {
    return uploadedCabinetImagePathPattern.exec(photoUrl)?.[1]
}

export async function saveCabinetImageManifest(manifest: StoredCabinetImageManifest) {
    const repository = AppDataSource.getRepository(CabinetImageManifestEntity)
    await repository.save(repository.create({
        originalKey: manifest.originalKey,
        version: manifest.version,
        manifest,
    }))
}

export async function deleteCabinetImageManifest(originalKey: string) {
    await AppDataSource.getRepository(CabinetImageManifestEntity).delete({ originalKey })
}

export async function getCabinetImageManifestMap(photoUrls: string[]) {
    const originalKeys = [...new Set(
        photoUrls
            .map(getOriginalKey)
            .filter((key): key is string => Boolean(key)),
    )]

    if (originalKeys.length === 0) {
        return new Map<string, StoredCabinetImageManifest>()
    }

    const rows = await AppDataSource.getRepository(CabinetImageManifestEntity).find({
        where: { originalKey: In(originalKeys) },
    })

    const manifests = new Map<string, StoredCabinetImageManifest>()
    for (const row of rows) {
        const manifest = parseStoredCabinetImageManifest(row.manifest)
        if (!manifest) {
            logWarn('Ignoring invalid cabinet image manifest', {
                operation: 'cabinet-image-manifest-read',
                originalKey: row.originalKey,
            })
            continue
        }

        manifests.set(row.originalKey, manifest)
    }

    return manifests
}
