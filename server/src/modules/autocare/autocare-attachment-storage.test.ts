import { createHash, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readdir, rm, stat, symlink, truncate, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { env } from '../../config/env.js'
import type { AutoCareAttachmentObjectEntry } from './autocare-attachment-storage.js'
import {
    MAX_AUTOCARE_ATTACHMENT_STORAGE_BYTES,
    createAutoCareAttachmentObjectKey,
    getAutoCareAttachmentObjectPath,
    readAutoCareAttachmentObject,
    removeAutoCareAttachmentObject,
    saveAutoCareAttachmentObject,
    selectAutoCareAttachmentCleanupCandidates,
    shouldDeleteAutoCareAttachmentObject,
    assertAutoCareAttachmentObjectKeyOwnedBy,
    assertAutoCareAttachmentChecksum,
    assertAutoCareAttachmentChecksumMetadata,
    assertAutoCareAttachmentByteLength,
    assertAutoCareAttachmentStoredByteLength,
    assertAutoCareAttachmentSize,
    assertAutoCareAttachmentHeadMetadata,
    assertAutoCareAttachmentPrivateState,
    assertAutoCareAttachmentStoredContentType,
    hasAutoCareAttachmentIntegrityMetadata,
    isAutoCareAttachmentObjectKeyOwnedBy,
    shouldDeleteAutoCareAttachmentObjectForRow,
} from './autocare-attachment-storage.js'

const storedKeys: string[] = []

afterEach(async () => {
    await Promise.all(storedKeys.splice(0).map((key) => removeAutoCareAttachmentObject(key)))
})

describe('AutoCare private attachment storage', () => {
    it('round-trips a private filesystem object without exposing a public path', async () => {
        const key = createAutoCareAttachmentObjectKey('requests', randomUUID(), randomUUID())
        const content = Buffer.from('private attachment fixture')
        storedKeys.push(key)

        await saveAutoCareAttachmentObject(key, content, 'image/png')

        await expect(readAutoCareAttachmentObject(key)).resolves.toEqual(content)
        expect(key).toMatch(/^autocare-requests\//)
        expect(key).not.toContain('private/')
        expect(key).not.toContain('quarantine/')
    })

    it('uses private parent/object permissions and leaves no temporary file', async () => {
        const key = createAutoCareAttachmentObjectKey('requests', randomUUID(), randomUUID())
        const objectPath = getAutoCareAttachmentObjectPath(key)
        storedKeys.push(key)

        await saveAutoCareAttachmentObject(key, Buffer.from('private attachment fixture'), 'image/png')

        const parentMode = (await stat(path.dirname(objectPath))).mode & 0o777
        const objectMode = (await stat(objectPath)).mode & 0o777
        expect(parentMode).toBe(0o700)
        expect(objectMode).toBe(0o600)
        expect(await readdir(path.dirname(objectPath))).not.toContain(
            expect.stringMatching(/\.tmp$/),
        )
    })

    it('rejects symlink objects before reading them', async () => {
        const key = createAutoCareAttachmentObjectKey('chats', randomUUID(), randomUUID())
        const objectPath = getAutoCareAttachmentObjectPath(key)
        const externalRoot = await mkdtemp(path.join(os.tmpdir(), 'autocarehub-attachment-target-'))
        const externalPath = path.join(externalRoot, 'payload.bin')
        storedKeys.push(key)

        await mkdir(path.dirname(objectPath), { recursive: true })
        await writeFile(externalPath, Buffer.from('outside attachment'))
        await symlink(externalPath, objectPath)

        await expect(readAutoCareAttachmentObject(key)).rejects.toMatchObject({ statusCode: 404 })
        await rm(externalRoot, { recursive: true, force: true })
    })

    it('rejects oversized filesystem objects before reading them', async () => {
        const key = createAutoCareAttachmentObjectKey('requests', randomUUID(), randomUUID())
        const objectPath = getAutoCareAttachmentObjectPath(key)
        storedKeys.push(key)

        await mkdir(path.dirname(objectPath), { recursive: true })
        await writeFile(objectPath, Buffer.alloc(1))
        await truncate(objectPath, MAX_AUTOCARE_ATTACHMENT_STORAGE_BYTES + 1)

        await expect(readAutoCareAttachmentObject(key)).rejects.toMatchObject({ statusCode: 404 })

        const emptyKey = createAutoCareAttachmentObjectKey('requests', randomUUID(), randomUUID())
        const emptyPath = getAutoCareAttachmentObjectPath(emptyKey)
        storedKeys.push(emptyKey)
        await mkdir(path.dirname(emptyPath), { recursive: true })
        await writeFile(emptyPath, Buffer.alloc(0))
        await expect(readAutoCareAttachmentObject(emptyKey)).rejects.toMatchObject({ statusCode: 404 })
    })

    it('rejects a tampered object when the stored checksum does not match', async () => {
        const key = createAutoCareAttachmentObjectKey('requests', randomUUID(), randomUUID())
        const content = Buffer.from('private attachment fixture')
        storedKeys.push(key)

        await saveAutoCareAttachmentObject(key, content, 'image/png')

        const checksum = createHash('sha256').update(content).digest('hex')
        await expect(readAutoCareAttachmentObject(key, checksum)).resolves.toEqual(content)
        await expect(readAutoCareAttachmentObject(key, '0'.repeat(64))).rejects.toMatchObject({ statusCode: 404 })
    })

    it('rejects oversized writes before touching private storage', async () => {
        const key = createAutoCareAttachmentObjectKey('requests', randomUUID(), randomUUID())
        const objectPath = getAutoCareAttachmentObjectPath(key)

        await expect(saveAutoCareAttachmentObject(key, Buffer.alloc(MAX_AUTOCARE_ATTACHMENT_STORAGE_BYTES + 1), 'image/png'))
            .rejects.toMatchObject({ statusCode: 422 })
        await expect(stat(objectPath)).rejects.toMatchObject({ code: 'ENOENT' })
    })

    it('fails closed when the filesystem attachment root is a symlink', async () => {
        const previousUploadsDir = env.cabinetUploadsDir
        const temporaryBase = await mkdtemp(path.join(os.tmpdir(), 'autocarehub-attachment-config-'))
        const externalRoot = await mkdtemp(path.join(os.tmpdir(), 'autocarehub-attachment-external-'))
        const root = path.join(temporaryBase, 'autocare', 'attachments')
        const key = createAutoCareAttachmentObjectKey('requests', randomUUID(), randomUUID())

        await mkdir(path.dirname(root), { recursive: true })
        await symlink(externalRoot, root)
        env.cabinetUploadsDir = path.join(temporaryBase, 'uploads')
        try {
            await expect(saveAutoCareAttachmentObject(key, Buffer.from('private attachment fixture'), 'image/png'))
                .rejects.toMatchObject({ statusCode: 404 })
            await expect(readdir(externalRoot)).resolves.toEqual([])
        } finally {
            env.cabinetUploadsDir = previousUploadsDir
            await rm(temporaryBase, { recursive: true, force: true })
            await rm(externalRoot, { recursive: true, force: true })
        }
    })

    it('rejects traversal and arbitrary object names', () => {
        expect(() => createAutoCareAttachmentObjectKey('chats', '../outside', randomUUID())).toThrow('Invalid attachment object key')
    })

    it('rejects unsupported storage MIME before touching private storage', async () => {
        const key = createAutoCareAttachmentObjectKey('requests', randomUUID(), randomUUID())
        const objectPath = getAutoCareAttachmentObjectPath(key)

        await expect(saveAutoCareAttachmentObject(key, Buffer.from('private attachment fixture'), 'application/octet-stream'))
            .rejects.toMatchObject({ statusCode: 404 })
        await expect(stat(objectPath)).rejects.toMatchObject({ code: 'ENOENT' })
    })

    it('binds object keys to their request or chat parent', () => {
        const requestId = randomUUID()
        const chatId = randomUUID()
        const requestKey = createAutoCareAttachmentObjectKey('requests', requestId, randomUUID())
        const chatKey = createAutoCareAttachmentObjectKey('chats', chatId, randomUUID())

        expect(isAutoCareAttachmentObjectKeyOwnedBy(requestKey, [{ scope: 'requests', parentId: requestId }])).toBe(true)
        expect(isAutoCareAttachmentObjectKeyOwnedBy(requestKey, [{ scope: 'requests', parentId: chatId }])).toBe(false)
        expect(isAutoCareAttachmentObjectKeyOwnedBy(chatKey, [{ scope: 'chats', parentId: chatId }])).toBe(true)
        expect(() => assertAutoCareAttachmentObjectKeyOwnedBy(requestKey, [{ scope: 'chats', parentId: chatId }]))
            .toThrowError(expect.objectContaining({ statusCode: 404 }))
    })

    it('requires a valid checksum for filesystem bytes and S3 metadata', () => {
        const content = Buffer.from('private attachment fixture')
        const checksum = createHash('sha256').update(content).digest('hex')
        expect(() => assertAutoCareAttachmentChecksum(content, checksum)).not.toThrow()
        expect(() => assertAutoCareAttachmentChecksum(content, '0'.repeat(64))).toThrowError(expect.objectContaining({ statusCode: 404 }))
        expect(() => assertAutoCareAttachmentChecksumMetadata({ sha256: checksum }, checksum)).not.toThrow()
        expect(() => assertAutoCareAttachmentChecksumMetadata({ sha256: '0'.repeat(64) }, checksum)).toThrowError(expect.objectContaining({ statusCode: 404 }))
        expect(() => assertAutoCareAttachmentChecksumMetadata({}, checksum)).toThrowError(expect.objectContaining({ statusCode: 404 }))
    })

    it('rejects attachment byte lengths that disagree with database metadata', () => {
        expect(() => assertAutoCareAttachmentByteLength(12, 12)).not.toThrow()
        expect(() => assertAutoCareAttachmentSize(Buffer.alloc(12), 12)).not.toThrow()
        expect(() => assertAutoCareAttachmentByteLength(11, 12)).toThrowError(expect.objectContaining({ statusCode: 404 }))
        expect(() => assertAutoCareAttachmentByteLength(12, 0)).toThrowError(expect.objectContaining({ statusCode: 404 }))
        expect(() => assertAutoCareAttachmentByteLength(12, Number.NaN)).toThrowError(expect.objectContaining({ statusCode: 404 }))
        expect(() => assertAutoCareAttachmentByteLength(12, null)).not.toThrow()
        expect(() => assertAutoCareAttachmentStoredByteLength(12)).not.toThrow()
        expect(() => assertAutoCareAttachmentStoredByteLength(0)).toThrowError(expect.objectContaining({ statusCode: 404 }))
        expect(() => assertAutoCareAttachmentStoredByteLength(MAX_AUTOCARE_ATTACHMENT_STORAGE_BYTES + 1)).toThrowError(expect.objectContaining({ statusCode: 404 }))
        expect(() => assertAutoCareAttachmentStoredByteLength(Number.NaN)).toThrowError(expect.objectContaining({ statusCode: 404 }))
    })

    it('does not sign quarantine objects or objects with a mismatched stored MIME', () => {
        expect(() => assertAutoCareAttachmentPrivateState({ state: 'private' })).not.toThrow()
        expect(() => assertAutoCareAttachmentPrivateState({})).not.toThrow()
        expect(() => assertAutoCareAttachmentPrivateState({ state: 'quarantine' }))
            .toThrowError(expect.objectContaining({ statusCode: 404 }))
        expect(() => assertAutoCareAttachmentStoredContentType(undefined, 'image/png')).not.toThrow()
        expect(() => assertAutoCareAttachmentStoredContentType('image/png', 'image/png')).not.toThrow()
        expect(() => assertAutoCareAttachmentStoredContentType('text/html', 'image/png'))
            .toThrowError(expect.objectContaining({ statusCode: 404 }))
    })

    it('requires safe S3 head metadata even for legacy rows', () => {
        expect(() => assertAutoCareAttachmentHeadMetadata({
            ContentLength: 12,
            ContentType: 'image/png',
            Metadata: { state: 'private' },
        }, 'image/png', null, null)).not.toThrow()
        expect(() => assertAutoCareAttachmentHeadMetadata({
            ContentLength: MAX_AUTOCARE_ATTACHMENT_STORAGE_BYTES + 1,
            ContentType: 'image/png',
            Metadata: { state: 'private' },
        }, 'image/png', null, null)).toThrowError(expect.objectContaining({ statusCode: 404 }))
        expect(() => assertAutoCareAttachmentHeadMetadata({
            ContentLength: 0,
            ContentType: 'image/png',
            Metadata: { state: 'private' },
        }, 'image/png', null, null)).toThrowError(expect.objectContaining({ statusCode: 404 }))
        expect(() => assertAutoCareAttachmentHeadMetadata({
            ContentLength: 12,
            ContentType: 'image/png',
            Metadata: { state: 'quarantine' },
        }, 'image/png', null, null)).toThrowError(expect.objectContaining({ statusCode: 404 }))
        expect(() => assertAutoCareAttachmentHeadMetadata({
            ContentType: 'image/png',
            Metadata: { state: 'private' },
        }, 'image/png', null, 12)).toThrowError(expect.objectContaining({ statusCode: 404 }))
    })

    it('runs S3 metadata preflight when only legacy byte metadata is available', () => {
        expect(hasAutoCareAttachmentIntegrityMetadata(null, 12)).toBe(true)
        expect(hasAutoCareAttachmentIntegrityMetadata(undefined, 12)).toBe(true)
        expect(hasAutoCareAttachmentIntegrityMetadata('a'.repeat(64), null)).toBe(true)
        expect(hasAutoCareAttachmentIntegrityMetadata(null, null)).toBe(false)
    })

    it('never deletes a foreign object when cleaning a legacy attachment row', () => {
        const requestId = randomUUID()
        const foreignRequestId = randomUUID()
        const objectKey = createAutoCareAttachmentObjectKey('requests', foreignRequestId, randomUUID())

        expect(shouldDeleteAutoCareAttachmentObjectForRow({
            objectKey,
            requestId,
            threadId: null,
            referenceCount: 1,
        })).toBe(false)
        expect(shouldDeleteAutoCareAttachmentObjectForRow({
            objectKey,
            requestId: foreignRequestId,
            threadId: null,
            referenceCount: 1,
        })).toBe(true)
        expect(shouldDeleteAutoCareAttachmentObjectForRow({
            objectKey: 'legacy/invalid-key',
            requestId,
            threadId: null,
            referenceCount: 1,
        })).toBe(false)
    })
})

describe('AutoCare attachment quarantine cleanup policy', () => {
    const referencedKey = `autocare-requests/${randomUUID()}/${randomUUID()}.bin`
    const orphanKey = `autocare-chats/${randomUUID()}/${randomUUID()}.bin`
    const recentQuarantineKey = `autocare-chats/${randomUUID()}/${randomUUID()}.bin`
    const entries = [
        { key: referencedKey, lastModifiedAt: 1_000, storageTier: 'private' },
        { key: referencedKey, lastModifiedAt: 1_000, storageTier: 'quarantine' },
        { key: orphanKey, lastModifiedAt: 1_000, storageTier: 'private' },
        { key: recentQuarantineKey, lastModifiedAt: 3_000, storageTier: 'quarantine' },
    ] as const satisfies readonly AutoCareAttachmentObjectEntry[]

    it('removes stale quarantine even when the promoted private object is referenced', () => {
        expect(selectAutoCareAttachmentCleanupCandidates({
            entries,
            referencedKeys: [referencedKey],
            cutoff: 2_000,
        })).toEqual([
            entries[1],
            entries[2],
        ])
    })

    it('preserves referenced private objects and quarantine objects inside the grace period', () => {
        const candidates = selectAutoCareAttachmentCleanupCandidates({
            entries,
            referencedKeys: [referencedKey],
            cutoff: 2_000,
        })

        expect(candidates).not.toContain(entries[0])
        expect(candidates).not.toContain(entries[3])
    })

    it('does not delete an object while another attachment row references it', () => {
        expect(shouldDeleteAutoCareAttachmentObject(1)).toBe(true)
        expect(shouldDeleteAutoCareAttachmentObject(2)).toBe(false)
        expect(shouldDeleteAutoCareAttachmentObject(0)).toBe(false)
        expect(shouldDeleteAutoCareAttachmentObject(Number.NaN)).toBe(false)
    })
})
