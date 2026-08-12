import type { EntityId, ISODateString } from '@/shared/types/common'

export type CabinetStatus = 'draft' | 'active' | 'blocked'

export type CabinetAvailabilityPreview = {
    date: string
    startTime: string
    endTime: string
    freeSlots: number
    slots: Array<{
        startTime: string
        endTime: string
    }>
}

export type CabinetImageAssetVariant = {
    url: string
    contentType: string
    bytes: number
    width: number
    height: number
    checksum: string
    version: string
}

export type CabinetImageAsset = {
    original: {
        url: string
        contentType: string | null
        bytes: number | null
        width: number | null
        height: number | null
        checksum: string | null
        version: string | null
    }
    fallbackUrl: string
    thumbnail?: CabinetImageAssetVariant | undefined
    preview?: CabinetImageAssetVariant | undefined
}

export type Cabinet = {
    id: EntityId
    ownerId: EntityId
    title: string
    description: string
    address: string
    city: string
    timezone?: string | undefined
    pricePerHour: number
    status: CabinetStatus
    photos: string[]
    photoAssets?: CabinetImageAsset[] | undefined
    amenities?: string[] | undefined
    cancellationPolicy?: string | null | undefined
    houseRules?: string | null | undefined
    createdAt: ISODateString
    availabilityPreview?: CabinetAvailabilityPreview | null | undefined
}
