import { mkdir, readFile, readdir, rename, rm, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

type AutoCareAttachmentScope = 'requests' | 'chats'

const attachmentKeyPattern = /^autocare-(requests|chats)\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.bin$/i
const attachmentRoot = path.resolve(env.cabinetUploadsDir, '..', 'autocare', 'attachments')

function attachmentNotFound(): never {
    throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Attachment not found.' })
}

export function createAutoCareAttachmentObjectKey(scope: AutoCareAttachmentScope, parentId: string, objectId: string) {
    const key = `autocare-${scope}/${parentId}/${objectId}.bin`
    assertSafeAutoCareAttachmentObjectKey(key)
    return key
}

export function assertSafeAutoCareAttachmentObjectKey(key: string) {
    if (!attachmentKeyPattern.test(key)) {
        throw new AppError({ statusCode: 400, code: ERROR_CODES.BadRequest, message: 'Invalid attachment object key.' })
    }
}

function getObjectPath(key: string) {
    assertSafeAutoCareAttachmentObjectKey(key)
    return path.join(attachmentRoot, key)
}

/**
 * Files are kept outside the public upload tree and written atomically. The
 * normalized bytes have already passed Sharp decoding before this function is
 * called, so raw client payloads never become downloadable objects.
 */
export async function saveAutoCareAttachmentObject(key: string, content: Buffer) {
    const target = getObjectPath(key)
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 })
    await writeFile(temporary, content, { mode: 0o600 })
    try {
        await rename(temporary, target)
    } catch (error) {
        await rm(temporary, { force: true }).catch(() => undefined)
        throw error
    }
}

export async function readAutoCareAttachmentObject(key: string) {
    try {
        return await readFile(getObjectPath(key))
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') attachmentNotFound()
        throw error
    }
}

export async function removeAutoCareAttachmentObject(key: string) {
    await unlink(getObjectPath(key)).catch((error: unknown) => {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    })
}

type AttachmentObjectEntry = { key: string; lastModifiedAt: number }

async function listScopeObjects(scope: AutoCareAttachmentScope) {
    const scopeRoot = path.join(attachmentRoot, `autocare-${scope}`)
    let parentEntries
    try {
        parentEntries = await readdir(scopeRoot, { withFileTypes: true })
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
        throw error
    }
    const entries: AttachmentObjectEntry[] = []
    for (const parent of parentEntries) {
        if (!parent.isDirectory() || !/^[a-f0-9-]{36}$/i.test(parent.name)) continue
        const parentRoot = path.join(scopeRoot, parent.name)
        const objects = await readdir(parentRoot, { withFileTypes: true })
        for (const object of objects) {
            const key = `autocare-${scope}/${parent.name}/${object.name}`
            if (!object.isFile() || !attachmentKeyPattern.test(key)) continue
            const file = await stat(path.join(parentRoot, object.name))
            entries.push({ key, lastModifiedAt: file.mtimeMs })
        }
    }
    return entries
}

export async function cleanupOrphanedAutoCareAttachmentObjects(input: {
    referencedKeys: readonly string[]
    now?: Date
    gracePeriodMs: number
}) {
    const referenced = new Set(input.referencedKeys.filter((key) => attachmentKeyPattern.test(key)))
    const entries = (await Promise.all([
        listScopeObjects('requests'),
        listScopeObjects('chats'),
    ])).flat()
    const cutoff = (input.now ?? new Date()).getTime() - input.gracePeriodMs
    const candidates = entries.filter((entry) => !referenced.has(entry.key) && entry.lastModifiedAt < cutoff)
    let failed = 0
    for (const candidate of candidates) {
        try {
            await removeAutoCareAttachmentObject(candidate.key)
        } catch {
            failed += 1
        }
    }
    return { scanned: entries.length, removed: candidates.length - failed, failed }
}
