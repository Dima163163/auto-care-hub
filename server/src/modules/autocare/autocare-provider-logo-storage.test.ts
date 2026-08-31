import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readdir, rm, symlink, truncate, utimes, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

import { afterEach, describe, expect, it } from 'vitest'

import { env } from '../../config/env.js'
import {
    createAutoCareProviderLogoReadStream,
    cleanupOrphanedAutoCareProviderLogos,
    getAutoCareProviderLogoFileName,
    readAutoCareProviderLogo,
    saveAutoCareProviderLogo,
} from './autocare-provider-logo-storage.js'

const createdPaths: string[] = []

afterEach(async () => {
    await Promise.all(createdPaths.splice(0).map((filePath) => rm(filePath, { force: true, recursive: true })))
})

describe('AutoCare provider logo storage', () => {
    it('keeps URL parsing inside the provider logo namespace', () => {
        const fileName = `${randomUUID()}.webp`
        expect(getAutoCareProviderLogoFileName(`/uploads/autocare/logos/${fileName}`)).toBe(fileName)
        expect(getAutoCareProviderLogoFileName('/uploads/autocare/logos/../secret.webp')).toBeNull()
        expect(getAutoCareProviderLogoFileName('https://example.com/logo.webp')).toBeNull()
        expect(getAutoCareProviderLogoFileName(`/uploads/autocare/logos/${'a'.repeat(125)}.webp`)).toBeNull()
    })

    it('does not follow symlinks when serving provider logos', async () => {
        const root = path.resolve(env.cabinetUploadsDir, '..', 'autocare', 'logos')
        await mkdir(root, { recursive: true })
        const target = path.join(root, `${randomUUID()}.txt`)
        const linkName = `${randomUUID()}.webp`
        const link = path.join(root, linkName)
        createdPaths.push(link, target)
        await writeFile(target, 'must not be served')
        await symlink(target, link)

        await expect(readAutoCareProviderLogo(linkName)).rejects.toMatchObject({ statusCode: 404 })
        expect(() => createAutoCareProviderLogoReadStream(linkName)).toThrow(/not found/i)
    })

    it('fails closed when the logo root is a symlink before writing', async () => {
        const previousUploadsDir = env.cabinetUploadsDir
        const temporaryBase = await mkdtemp(path.join(os.tmpdir(), 'autocarehub-logo-config-'))
        const externalRoot = await mkdtemp(path.join(os.tmpdir(), 'autocarehub-logo-external-'))
        const root = path.join(temporaryBase, 'autocare', 'logos')
        createdPaths.push(temporaryBase, externalRoot)

        await mkdir(path.dirname(root), { recursive: true })
        await symlink(externalRoot, root)
        env.cabinetUploadsDir = path.join(temporaryBase, 'uploads')
        try {
            const image = await sharp({
                create: { width: 1, height: 1, channels: 3, background: '#ffffff' },
            }).png().toBuffer()
            await expect(saveAutoCareProviderLogo(image)).rejects.toMatchObject({ statusCode: 404 })
            await expect(readdir(externalRoot)).resolves.toEqual([])
        } finally {
            env.cabinetUploadsDir = previousUploadsDir
        }
    })

    it('rejects oversized files already present on disk', async () => {
        const root = path.resolve(env.cabinetUploadsDir, '..', 'autocare', 'logos')
        await mkdir(root, { recursive: true })
        const fileName = `${randomUUID()}.webp`
        const filePath = path.join(root, fileName)
        createdPaths.push(filePath)
        await writeFile(filePath, Buffer.alloc(1))
        await truncate(filePath, 1024 * 1024 + 1)

        await expect(readAutoCareProviderLogo(fileName)).rejects.toMatchObject({ statusCode: 404 })
        expect(() => createAutoCareProviderLogoReadStream(fileName)).toThrow(/not found/i)

        const emptyFileName = `${randomUUID()}.webp`
        const emptyPath = path.join(root, emptyFileName)
        createdPaths.push(emptyPath)
        await writeFile(emptyPath, Buffer.alloc(0))
        await expect(readAutoCareProviderLogo(emptyFileName)).rejects.toMatchObject({ statusCode: 404 })
        expect(() => createAutoCareProviderLogoReadStream(emptyFileName)).toThrow(/not found/i)
    })

    it('skips symlinks and oversized files during logo orphan cleanup', async () => {
        const root = path.resolve(env.cabinetUploadsDir, '..', 'autocare', 'logos')
        const orphanName = `${randomUUID()}.webp`
        const linkName = `${randomUUID()}.webp`
        const orphanPath = path.join(root, orphanName)
        const linkPath = path.join(root, linkName)
        const externalRoot = await mkdtemp(path.join(os.tmpdir(), 'autocarehub-logo-target-'))
        const externalPath = path.join(externalRoot, 'payload.bin')
        createdPaths.push(orphanPath, linkPath, externalRoot)

        await mkdir(root, { recursive: true })
        await writeFile(orphanPath, 'orphan')
        await utimes(orphanPath, new Date(0), new Date(0))
        await writeFile(externalPath, 'must remain untouched')
        await symlink(externalPath, linkPath)

        await expect(cleanupOrphanedAutoCareProviderLogos({
            referencedUrls: [],
            now: new Date(10_000),
            gracePeriodMs: 1,
        })).resolves.toMatchObject({ scanned: 1, removed: 1, failed: 0 })
        await expect(readdir(root)).resolves.not.toContain(orphanName)
        await expect(readAutoCareProviderLogo(linkName)).rejects.toMatchObject({ statusCode: 404 })
        await expect(writeFile(externalPath, 'must remain untouched')).resolves.toBeUndefined()
    })
})
