import type { EntityId } from '@/shared/types/common'

export type Service = {
    id: EntityId
    cabinetId: EntityId
    title: string
    description?: string | null
    durationMinutes: number
    price: number
    isActive: boolean
}