export const CABINET_IMAGE_STORAGE_PROVIDERS = ['filesystem', 's3'] as const
export type CabinetImageStorageProviderKind = (typeof CABINET_IMAGE_STORAGE_PROVIDERS)[number]

export function resolveCabinetImageStorageProvider(value: string | undefined): CabinetImageStorageProviderKind {
    if (!value) return 'filesystem'
    if (CABINET_IMAGE_STORAGE_PROVIDERS.includes(value as CabinetImageStorageProviderKind)) {
        return value as CabinetImageStorageProviderKind
    }

    throw new Error('CABINET_IMAGE_STORAGE_PROVIDER must be filesystem or s3.')
}

export function isCabinetImageStorageProviderConfigured(
    provider: CabinetImageStorageProviderKind,
    nodeEnv: string,
) {
    return provider !== 's3' || nodeEnv === 'production' || nodeEnv === 'test'
}

export function assertCabinetImageStorageProviderAvailable(provider: CabinetImageStorageProviderKind) {
    if (provider === 's3') {
        throw new Error('S3 cabinet image storage is configured but its adapter is not installed.')
    }
}
