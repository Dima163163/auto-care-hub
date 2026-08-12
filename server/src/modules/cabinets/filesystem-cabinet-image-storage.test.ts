import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
    FileSystemCabinetImageStorage,
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
})
