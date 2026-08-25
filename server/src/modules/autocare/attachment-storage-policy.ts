export const AUTOCARE_ATTACHMENT_STORAGE_PROVIDERS = ['filesystem', 's3'] as const
export const AUTOCARE_ATTACHMENT_ANTIVIRUS_MODES = ['disabled', 'clamav'] as const

export type AutoCareAttachmentStorageProvider =
    (typeof AUTOCARE_ATTACHMENT_STORAGE_PROVIDERS)[number]
export type AutoCareAttachmentAntivirusMode =
    (typeof AUTOCARE_ATTACHMENT_ANTIVIRUS_MODES)[number]

export function resolveAutoCareAttachmentStorageProvider(
    value: string | undefined,
): AutoCareAttachmentStorageProvider {
    const normalized = value?.trim().toLowerCase() || 'filesystem'
    if (AUTOCARE_ATTACHMENT_STORAGE_PROVIDERS.includes(normalized as AutoCareAttachmentStorageProvider)) {
        return normalized as AutoCareAttachmentStorageProvider
    }
    throw new Error('AUTOCARE_ATTACHMENT_STORAGE_PROVIDER must be filesystem or s3.')
}

export function resolveAutoCareAttachmentAntivirusMode(
    value: string | undefined,
): AutoCareAttachmentAntivirusMode {
    const normalized = value?.trim().toLowerCase() || 'disabled'
    if (AUTOCARE_ATTACHMENT_ANTIVIRUS_MODES.includes(normalized as AutoCareAttachmentAntivirusMode)) {
        return normalized as AutoCareAttachmentAntivirusMode
    }
    throw new Error('AUTOCARE_ATTACHMENT_ANTIVIRUS_MODE must be disabled or clamav.')
}

export function assertProductionAutoCareAttachmentPolicy(input: {
    nodeEnv: string
    storageProvider: AutoCareAttachmentStorageProvider
    antivirusMode: AutoCareAttachmentAntivirusMode
}) {
    if (input.nodeEnv !== 'production') return
    if (input.storageProvider !== 's3') {
        throw new Error('Production requires AUTOCARE_ATTACHMENT_STORAGE_PROVIDER=s3.')
    }
    if (input.antivirusMode !== 'clamav') {
        throw new Error('Production requires AUTOCARE_ATTACHMENT_ANTIVIRUS_MODE=clamav.')
    }
}
