import { describe, expect, it } from 'vitest'

import {
    assertProductionAutoCareAttachmentPolicy,
    resolveAutoCareAttachmentAntivirusMode,
    resolveAutoCareAttachmentStorageProvider,
} from './attachment-storage-policy.js'

describe('AutoCare attachment storage policy', () => {
    it('keeps filesystem and disabled scanning available only outside production', () => {
        expect(resolveAutoCareAttachmentStorageProvider(undefined)).toBe('filesystem')
        expect(resolveAutoCareAttachmentAntivirusMode(undefined)).toBe('disabled')
        expect(() => assertProductionAutoCareAttachmentPolicy({
            nodeEnv: 'development', storageProvider: 'filesystem', antivirusMode: 'disabled',
        })).not.toThrow()
        expect(() => assertProductionAutoCareAttachmentPolicy({
            nodeEnv: 'production', storageProvider: 'filesystem', antivirusMode: 'disabled',
        })).toThrow(/AUTOCARE_ATTACHMENT_STORAGE_PROVIDER/)
    })

    it('requires an external store and scanner in production', () => {
        expect(() => assertProductionAutoCareAttachmentPolicy({
            nodeEnv: 'production', storageProvider: 's3', antivirusMode: 'clamav',
        })).not.toThrow()
        expect(() => resolveAutoCareAttachmentStorageProvider('public')).toThrow()
        expect(() => resolveAutoCareAttachmentAntivirusMode('none')).toThrow()
    })
})
