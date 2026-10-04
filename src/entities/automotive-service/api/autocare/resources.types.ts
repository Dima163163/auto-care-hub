

export type AutoCareCapacityResource = {
    id: string
    providerId: string
    locationId: string
    type: 'specialist' | 'bay' | 'lift' | 'equipment'
    name: string
    capacity: number
    active: boolean
    metadata: Record<string, unknown>
    createdAt: string
    updatedAt: string
}

export type AutoCareCapacityReservation = {
    id: string
    requestId: string
    resourceId: string
    providerId: string
    locationId: string
    startsAt: string
    endsAt: string
    status: 'active' | 'released'
    releasedAt: string | null
    createdAt: string
}

export type CreateAutoCareCapacityResourceInput = Omit<AutoCareCapacityResource, 'id' | 'providerId' | 'createdAt' | 'updatedAt'>

export type UpdateAutoCareCapacityResourceInput = { providerId: string; resourceId: string } & Partial<Omit<CreateAutoCareCapacityResourceInput, 'locationId'>>
