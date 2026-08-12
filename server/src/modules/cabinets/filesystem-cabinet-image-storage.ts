import { createReadStream } from 'node:fs'
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
    assertSafeCabinetImageObjectKey,
    type CabinetImageObjectEntry,
    type CabinetImageStorageProvider,
} from './cabinet-image-storage-provider.js'

export function getCabinetImageObjectPath(rootDir: string, key: string) {
    assertSafeCabinetImageObjectKey(key)
    return path.join(rootDir, key)
}

export class FileSystemCabinetImageStorage implements CabinetImageStorageProvider {
    constructor(private readonly rootDir: string) {}

    async put(key: string, content: Buffer) {
        await mkdir(this.rootDir, { recursive: true })
        await writeFile(getCabinetImageObjectPath(this.rootDir, key), content)
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
                const fileStat = await stat(getCabinetImageObjectPath(this.rootDir, entry.name))
                result.push({ key: entry.name, lastModifiedAt: fileStat.mtimeMs })
            } catch {
                // Ignore unrelated files in the provider directory.
            }
        }

        return result
    }

    createReadStream(key: string) {
        return createReadStream(getCabinetImageObjectPath(this.rootDir, key))
    }
}
