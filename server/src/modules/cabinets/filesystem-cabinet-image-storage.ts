import { randomUUID } from 'node:crypto'
import { closeSync, constants as fsConstants, createReadStream, fstatSync, lstatSync, openSync } from 'node:fs'
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

function assertCabinetImageContentSize(content: Buffer) {
    if (content.length < 1) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.CabinetImageInvalidContent,
            message: 'Cabinet image content is empty.',
        })
    }

    if (content.length > MAX_CABINET_IMAGE_BYTES) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.CabinetImageTooLarge,
            message: `Cabinet image must be ${MAX_CABINET_IMAGE_BYTES} bytes or smaller.`,
        })
    }
}

export function getCabinetImageObjectPath(rootDir: string, key: string) {
    assertSafeCabinetImageObjectKey(key)
    return path.join(rootDir, key)
}

export class FileSystemCabinetImageStorage implements CabinetImageStorageProvider {
    constructor(private readonly rootDir: string) {}

    private async assertRoot(allowMissing = false) {
        const root = path.resolve(this.rootDir)
        const parent = path.dirname(root)
        try {
            const parentEntry = await lstat(parent)
            if (parentEntry.isSymbolicLink() || !parentEntry.isDirectory()) cabinetImageNotFound()
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                if (allowMissing) return false
                cabinetImageNotFound()
            }
            throw error
        }
        try {
            const rootEntry = await lstat(root)
            if (rootEntry.isSymbolicLink() || !rootEntry.isDirectory()) cabinetImageNotFound()
            return true
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                if (allowMissing) return false
                cabinetImageNotFound()
            }
            throw error
        }
    }

    private assertRootSync() {
        const root = path.resolve(this.rootDir)
        const parent = path.dirname(root)
        try {
            const parentEntry = lstatSync(parent)
            if (parentEntry.isSymbolicLink() || !parentEntry.isDirectory()) cabinetImageNotFound()
            const rootEntry = lstatSync(root)
            if (rootEntry.isSymbolicLink() || !rootEntry.isDirectory()) cabinetImageNotFound()
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') cabinetImageNotFound()
            throw error
        }
    }

    async put(key: string, content: Buffer) {
        const target = getCabinetImageObjectPath(this.rootDir, key)
        assertCabinetImageContentSize(content)
        await this.assertRoot(true)
        await mkdir(this.rootDir, { recursive: true, mode: 0o700 })
        await this.assertRoot()
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
        if (!(await this.assertRoot(true))) return
        await rm(getCabinetImageObjectPath(this.rootDir, key), { force: true })
    }

    async list(): Promise<CabinetImageObjectEntry[]> {
        if (!(await this.assertRoot(true))) return []
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
        this.assertRootSync()
        const target = getCabinetImageObjectPath(this.rootDir, key)
        let fileDescriptor: number | undefined
        try {
            const openFlags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0)
            fileDescriptor = openSync(target, openFlags)
            const file = fstatSync(fileDescriptor)
            if (!file.isFile() || file.size < 1 || file.size > MAX_CABINET_IMAGE_BYTES) cabinetImageNotFound()
        } catch (error) {
            if (fileDescriptor !== undefined) closeSync(fileDescriptor)
            if (error instanceof AppError) throw error
            if (['ENOENT', 'ELOOP', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) cabinetImageNotFound()
            throw error
        }
        return createReadStream(target, { fd: fileDescriptor, autoClose: true })
    }
}
