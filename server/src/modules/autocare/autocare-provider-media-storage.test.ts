import { randomUUID } from 'node:crypto'
import { mkdir, rm, symlink, truncate, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { env } from '../../config/env.js'
import {
    assertAutoCareProviderMediaFileName,
    createAutoCareProviderMediaReadStream,
    readAutoCareProviderMedia,
} from './autocare-provider-media-storage.js'

const createdPaths: string[] = []

afterEach(async () => {
    await Promise.all(createdPaths.splice(0).map((filePath) => rm(filePath, { force: true })))
})

describe('AutoCare provider media storage', () => {
    it('accepts only generated webp file names', () => {
        expect(() => assertAutoCareProviderMediaFileName(`${randomUUID()}.webp`)).not.toThrow()
        expect(() => assertAutoCareProviderMediaFileName('../outside.webp')).toThrow()
        expect(() => assertAutoCareProviderMediaFileName(`${randomUUID()}.jpg`)).toThrow()
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
    })
})
