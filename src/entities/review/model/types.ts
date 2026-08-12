import type { EntityId, ISODateString } from '@/shared/types/common'

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export type ReviewClient = {
    id: EntityId
    name: string
}

export type ReviewCabinet = {
    id: EntityId
    title: string
}

export type Review = {
    id: EntityId
    cabinetId: EntityId
    clientId: EntityId
    rating: number
    text: string
    status: ReviewStatus
    createdAt: ISODateString
    client: ReviewClient
}

export type AdminReview = Review & {
    bookingId: EntityId
    updatedAt: ISODateString
    cabinet: ReviewCabinet
}

export type ClientReview = Review & {
    cabinet: ReviewCabinet
}
