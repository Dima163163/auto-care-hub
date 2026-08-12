import type { CabinetStatus } from '../../entities/cabinet/cabinet.entity.js'

export type PublicCabinet = {
    id: string
    ownerId: string
    title: string
    description: string
    address: string
    city: string
    timezone: string
    pricePerHour: number
    status: CabinetStatus
    photos: string[]
    photoAssets: CabinetImageAsset[]
    amenities: string[]
    cancellationPolicy: string | null
    houseRules: string | null
    createdAt: Date
    availabilityPreview: CabinetAvailabilityPreview | null
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
    thumbnail?: CabinetImageAssetVariant
    preview?: CabinetImageAssetVariant
}

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

export type OwnerCabinet = PublicCabinet

export type DeleteCabinetResponse = {
    success: true
}
