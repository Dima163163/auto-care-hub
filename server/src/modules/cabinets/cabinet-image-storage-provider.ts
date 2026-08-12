import type { ReadStream } from 'node:fs'

import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { normalizeCabinetImageFileName } from './cabinet-image-file-name.js'

export type CabinetImageObjectEntry = {
    key: string
    lastModifiedAt: number
}

export interface CabinetImageStorageProvider {
    put(key: string, content: Buffer): Promise<void>
    remove(key: string): Promise<void>
    list(): Promise<CabinetImageObjectEntry[]>
    createReadStream(key: string): ReadStream
}

export function assertSafeCabinetImageObjectKey(key: string) {
    try {
        normalizeCabinetImageFileName(key)
    } catch {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.CabinetImageInvalidFileName,
            message: 'Invalid cabinet image file name.',
        })
    }
}
