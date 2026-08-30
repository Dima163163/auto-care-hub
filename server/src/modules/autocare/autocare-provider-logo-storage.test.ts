import { randomUUID } from 'node:crypto'
import { mkdir, rm, symlink, truncate, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { env } from '../../config/env.js'
import {
    createAutoCareProviderLogoReadStream,
    getAutoCareProviderLogoFileName,
    readAutoCareProviderLogo,
} from './autocare-provider-logo-storage.js'

const createdPaths: string[] = []

afterEach(async () => {
    await Promise.all(createdPaths.splice(0).map((filePath) => rm(filePath, { force: true })))
})

describe('AutoCare provider logo storage', () => {
    it('keeps URL parsing inside the provider logo namespace', () => {
        const fileName = `${randomUUID()}.webp`
        expect(getAutoCareProviderLogoFileName(`/uploads/autocare/logos/${fileName}`)).toBe(fileName)
        expect(getAutoCareProviderLogoFileName('/uploads/autocare/logos/../secret.webp')).toBeNull()
        expect(getAutoCareProviderLogoFileName('https://example.com/logo.webp')).toBeNull()
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
    })
})
