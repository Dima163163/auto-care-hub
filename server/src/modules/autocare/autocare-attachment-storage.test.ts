import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readdir, rm, stat, symlink, truncate, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { AutoCareAttachmentObjectEntry } from './autocare-attachment-storage.js'
import {
    MAX_AUTOCARE_ATTACHMENT_STORAGE_BYTES,
    createAutoCareAttachmentObjectKey,
    getAutoCareAttachmentObjectPath,
    readAutoCareAttachmentObject,
    removeAutoCareAttachmentObject,
    saveAutoCareAttachmentObject,
    selectAutoCareAttachmentCleanupCandidates,
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

        await saveAutoCareAttachmentObject(key, content, 'application/octet-stream')

        await expect(readAutoCareAttachmentObject(key)).resolves.toEqual(content)
        expect(key).toMatch(/^autocare-requests\//)
        expect(key).not.toContain('private/')
        expect(key).not.toContain('quarantine/')
    })

    it('uses private parent/object permissions and leaves no temporary file', async () => {
        const key = createAutoCareAttachmentObjectKey('requests', randomUUID(), randomUUID())
        const objectPath = getAutoCareAttachmentObjectPath(key)
        storedKeys.push(key)

        await saveAutoCareAttachmentObject(key, Buffer.from('private attachment fixture'))

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
    })

    it('rejects oversized writes before touching private storage', async () => {
        const key = createAutoCareAttachmentObjectKey('requests', randomUUID(), randomUUID())
        const objectPath = getAutoCareAttachmentObjectPath(key)

        await expect(saveAutoCareAttachmentObject(key, Buffer.alloc(MAX_AUTOCARE_ATTACHMENT_STORAGE_BYTES + 1)))
            .rejects.toMatchObject({ statusCode: 422 })
        await expect(stat(objectPath)).rejects.toMatchObject({ code: 'ENOENT' })
    })

    it('rejects traversal and arbitrary object names', () => {
        expect(() => createAutoCareAttachmentObjectKey('chats', '../outside', randomUUID())).toThrow('Invalid attachment object key')
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
})
