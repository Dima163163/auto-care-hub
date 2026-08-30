import { randomUUID } from 'node:crypto'
import { createReadStream, lstatSync } from 'node:fs'
import { lstat, mkdir, readdir, rename, rm, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import {
    assertSafeCabinetImageObjectKey,
    type CabinetImageObjectEntry,
    type CabinetImageStorageProvider,
} from './cabinet-image-storage-provider.js'

export const MAX_CABINET_IMAGE_BYTES = 1_048_576

function cabinetImageNotFound(): never {
    throw new AppError({
        statusCode: 404,
        code: ERROR_CODES.NotFound,
        message: 'Cabinet image not found.',
    })
}

export function getCabinetImageObjectPath(rootDir: string, key: string) {
    assertSafeCabinetImageObjectKey(key)
    return path.join(rootDir, key)
}

export class FileSystemCabinetImageStorage implements CabinetImageStorageProvider {
    constructor(private readonly rootDir: string) {}

    async put(key: string, content: Buffer) {
        const target = getCabinetImageObjectPath(this.rootDir, key)
        await mkdir(this.rootDir, { recursive: true, mode: 0o700 })
        const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`
        try {
            await writeFile(temporary, content, { flag: 'wx', mode: 0o600 })
            await rename(temporary, target)
        } catch (error) {
            await unlink(temporary).catch(() => undefined)
            throw error
        }
    }

    async remove(key: string) {
        await rm(getCabinetImageObjectPath(this.rootDir, key), { force: true })
    }

    async list(): Promise<CabinetImageObjectEntry[]> {
        let entries
        try {
            entries = await readdir(this.rootDir, { withFileTypes: true })
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
            throw error
        }

        const result: CabinetImageObjectEntry[] = []
        for (const entry of entries) {
            if (!entry.isFile()) continue

            try {
                assertSafeCabinetImageObjectKey(entry.name)
                const fileStat = await lstat(getCabinetImageObjectPath(this.rootDir, entry.name))
                if (!fileStat.isFile()) continue
                result.push({ key: entry.name, lastModifiedAt: fileStat.mtimeMs })
            } catch {
                // Ignore unrelated files in the provider directory.
            }
        }

        return result
    }

    createReadStream(key: string) {
        const target = getCabinetImageObjectPath(this.rootDir, key)
        try {
            const file = lstatSync(target)
            if (!file.isFile() || file.size > MAX_CABINET_IMAGE_BYTES) cabinetImageNotFound()
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') cabinetImageNotFound()
            throw error
        }
        return createReadStream(target)
    }
}
