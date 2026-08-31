import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readdir, rm, stat, symlink, truncate, utimes, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

import { afterEach, describe, expect, it } from 'vitest'

import { env } from '../../config/env.js'
import {
    assertAutoCareProviderMediaFileName,
    createAutoCareProviderMediaReadStream,
    cleanupOrphanedAutoCareProviderMedia,
    getAutoCareProviderMediaStorageTarget,
    readAutoCareProviderMedia,
    saveAutoCareProviderMedia,
} from './autocare-provider-media-storage.js'

const createdPaths: string[] = []

afterEach(async () => {
    await Promise.all(createdPaths.splice(0).map((filePath) => rm(filePath, { force: true, recursive: true })))
})

describe('AutoCare provider media storage', () => {
    it('accepts only generated webp file names', () => {
        expect(() => assertAutoCareProviderMediaFileName(`${randomUUID()}.webp`)).not.toThrow()
        expect(() => assertAutoCareProviderMediaFileName('../outside.webp')).toThrow()
        expect(() => assertAutoCareProviderMediaFileName(`${randomUUID()}.jpg`)).toThrow()
        expect(() => assertAutoCareProviderMediaFileName(`${'a'.repeat(125)}.webp`)).toThrow()
    })

    it('resolves deletion targets only from the matching provider media namespace', () => {
        const fileName = `${randomUUID()}.webp`
        expect(getAutoCareProviderMediaStorageTarget(`/uploads/autocare/media/gallery/${fileName}`, 'gallery')).toEqual({
            kind: 'gallery',
            fileName,
        })
        expect(getAutoCareProviderMediaStorageTarget(`/uploads/autocare/media/gallery/${fileName}`, 'cover')).toBeNull()
        expect(getAutoCareProviderMediaStorageTarget(`https://media.example/${fileName}`, 'gallery')).toBeNull()
        expect(getAutoCareProviderMediaStorageTarget(`/uploads/autocare/media/gallery/${'a'.repeat(125)}.webp`, 'gallery')).toBeNull()
    })

    it('does not follow symlinks when serving provider media', async () => {
        const root = path.resolve(env.cabinetUploadsDir, '..', 'autocare', 'media', 'gallery')
        await mkdir(root, { recursive: true })
        const target = path.join(root, `${randomUUID()}.txt`)
        const linkName = `${randomUUID()}.webp`
        const link = path.join(root, linkName)
        createdPaths.push(link, target)
        await writeFile(target, 'must not be served')
        await symlink(target, link)

        await expect(readAutoCareProviderMedia('gallery', linkName)).rejects.toMatchObject({ statusCode: 404 })
        expect(() => createAutoCareProviderMediaReadStream('gallery', linkName)).toThrow(/not found/i)
    })

    it('fails closed when a media root is replaced by a symlink before writing', async () => {
        const previousUploadsDir = env.cabinetUploadsDir
        const temporaryBase = await mkdtemp(path.join(os.tmpdir(), 'autocarehub-media-config-'))
        const externalRoot = await mkdtemp(path.join(os.tmpdir(), 'autocarehub-media-external-'))
        const root = path.join(temporaryBase, 'autocare', 'media', 'gallery')
        createdPaths.push(temporaryBase, externalRoot)

        await mkdir(path.dirname(root), { recursive: true })
        await symlink(externalRoot, root)
        env.cabinetUploadsDir = path.join(temporaryBase, 'uploads')
        try {
            const image = await sharp({
                create: { width: 1, height: 1, channels: 3, background: '#ffffff' },
            }).png().toBuffer()
            await expect(saveAutoCareProviderMedia('gallery', image)).rejects.toMatchObject({ statusCode: 404 })
            await expect(readdir(externalRoot)).resolves.toEqual([])
        } finally {
            env.cabinetUploadsDir = previousUploadsDir
        }
    })

    it('rejects oversized files already present on disk', async () => {
        const root = path.resolve(env.cabinetUploadsDir, '..', 'autocare', 'media', 'cover')
        await mkdir(root, { recursive: true })
        const fileName = `${randomUUID()}.webp`
        const filePath = path.join(root, fileName)
        createdPaths.push(filePath)
        await writeFile(filePath, Buffer.alloc(1))
        await truncate(filePath, 6 * 1024 * 1024 + 1)

        await expect(readAutoCareProviderMedia('cover', fileName)).rejects.toMatchObject({ statusCode: 404 })
        expect(() => createAutoCareProviderMediaReadStream('cover', fileName)).toThrow(/not found/i)

        const emptyFileName = `${randomUUID()}.webp`
        const emptyPath = path.join(root, emptyFileName)
        createdPaths.push(emptyPath)
        await writeFile(emptyPath, Buffer.alloc(0))
        await expect(readAutoCareProviderMedia('cover', emptyFileName)).rejects.toMatchObject({ statusCode: 404 })
        expect(() => createAutoCareProviderMediaReadStream('cover', emptyFileName)).toThrow(/not found/i)
    })

    it('skips symlinks and oversized files during orphan cleanup', async () => {
        const root = path.resolve(env.cabinetUploadsDir, '..', 'autocare', 'media', 'gallery')
        const orphanName = `${randomUUID()}.webp`
        const linkName = `${randomUUID()}.webp`
        const orphanPath = path.join(root, orphanName)
        const linkPath = path.join(root, linkName)
        const externalRoot = path.join(os.tmpdir(), `autocarehub-media-target-${randomUUID()}`)
        const externalPath = path.join(externalRoot, 'payload.bin')
        createdPaths.push(orphanPath, linkPath, externalRoot)

        await mkdir(root, { recursive: true })
        await mkdir(externalRoot, { recursive: true })
        await writeFile(orphanPath, 'orphan')
        await utimes(orphanPath, new Date(0), new Date(0))
        await writeFile(externalPath, 'must remain untouched')
        await symlink(externalPath, linkPath)

        await expect(cleanupOrphanedAutoCareProviderMedia({
            kind: 'gallery',
            referencedUrls: [],
            now: new Date(10_000),
            gracePeriodMs: 1,
        })).resolves.toMatchObject({ scanned: 1, removed: 1, failed: 0 })
        await expect(stat(orphanPath)).rejects.toMatchObject({ code: 'ENOENT' })
        await expect(readAutoCareProviderMedia('gallery', linkName)).rejects.toMatchObject({ statusCode: 404 })
        await expect(writeFile(externalPath, 'must remain untouched')).resolves.toBeUndefined()
    })
})
