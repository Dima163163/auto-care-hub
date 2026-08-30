import { mkdtemp, rm, symlink, truncate, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
    FileSystemCabinetImageStorage,
    MAX_CABINET_IMAGE_BYTES,
    getCabinetImageObjectPath,
} from './filesystem-cabinet-image-storage.js'

const roots: string[] = []

afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('filesystem cabinet image storage', () => {
    it('rejects traversal keys before resolving a path', () => {
        expect(() => getCabinetImageObjectPath('/tmp/uploads', '../secret.webp')).toThrow()
        expect(getCabinetImageObjectPath('/tmp/uploads', 'abc.webp')).toBe(
            path.join('/tmp/uploads', 'abc.webp'),
        )
    })

    it('stores and lists only safe image objects', async () => {
        const root = await mkdtemp(path.join(os.tmpdir(), 'autocarehub-images-'))
        roots.push(root)
        const storage = new FileSystemCabinetImageStorage(root)

        await storage.put('abc.webp', Buffer.from('image'))

        await expect(storage.list()).resolves.toEqual([
            expect.objectContaining({ key: 'abc.webp' }),
        ])
        await storage.remove('abc.webp')
        await expect(storage.list()).resolves.toEqual([])
    })

    it('stores derived thumbnail objects beside the original', async () => {
        const root = await mkdtemp(path.join(os.tmpdir(), 'autocarehub-images-'))
        roots.push(root)
        const storage = new FileSystemCabinetImageStorage(root)

        await storage.put('abc.webp', Buffer.from('original'))
        await storage.put('abc-thumb.webp', Buffer.from('thumbnail'))

        await expect(storage.list()).resolves.toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'abc.webp' }),
            expect.objectContaining({ key: 'abc-thumb.webp' }),
        ]))
    })

    it('rejects symlink objects before opening a read stream', async () => {
        const root = await mkdtemp(path.join(os.tmpdir(), 'autocarehub-images-'))
        roots.push(root)
        const storage = new FileSystemCabinetImageStorage(root)
        const target = path.join(root, 'target.bin')
        const link = 'a1b2c3.webp'

        await writeFile(target, Buffer.from('image'))
        await symlink(target, getCabinetImageObjectPath(root, link))

        expect(() => storage.createReadStream(link)).toThrow(/not found/i)
    })

    it('rejects oversized objects before opening a read stream', async () => {
        const root = await mkdtemp(path.join(os.tmpdir(), 'autocarehub-images-'))
        roots.push(root)
        const storage = new FileSystemCabinetImageStorage(root)
        const key = 'b1c2d3.webp'
        const target = getCabinetImageObjectPath(root, key)

        await writeFile(target, Buffer.alloc(1))
        await truncate(target, MAX_CABINET_IMAGE_BYTES + 1)

        expect(() => storage.createReadStream(key)).toThrow(/not found/i)
    })
})
