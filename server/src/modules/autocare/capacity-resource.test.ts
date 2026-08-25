import { describe, expect, it } from 'vitest'

import { hasAvailableResourceCapacity, selectAvailableResources, type CapacityResource } from './capacity-reservation.js'

const resources: CapacityResource[] = [
    { id: 'bay-1', type: 'bay', capacity: 1 },
    { id: 'lift-1', type: 'lift', capacity: 1 },
    { id: 'specialist-anna', type: 'specialist', capacity: 1 },
    { id: 'specialist-boris', type: 'specialist', capacity: 1 },
]

const candidate = { startsAtMinutes: 600, durationMinutes: 60 }

describe('resource-level capacity policy', () => {
    it('requires every explicitly selected resource to be available', () => {
        expect(hasAvailableResourceCapacity({ resources, requiredResourceIds: ['bay-1', 'lift-1'], candidate, reservations: [] })).toBe(true)
        expect(hasAvailableResourceCapacity({
            resources,
            requiredResourceIds: ['bay-1', 'lift-1'],
            candidate,
            reservations: [{ resourceId: 'bay-1', ...candidate }],
        })).toBe(false)
    })

    it('does not count reservations for another resource', () => {
        expect(hasAvailableResourceCapacity({
            resources,
            requiredResourceIds: ['bay-1'],
            candidate,
            reservations: [{ resourceId: 'lift-1', ...candidate }],
        })).toBe(true)
    })

    it('selects a free specialist and lift deterministically', () => {
        expect(selectAvailableResources({
            resources,
            requiredTypes: ['specialist', 'lift'],
            candidate,
            reservations: [{ resourceId: 'specialist-anna', ...candidate }],
        })).toEqual(['specialist-boris', 'lift-1'])
    })

    it('returns null when every resource of a requested type is occupied', () => {
        expect(selectAvailableResources({
            resources,
            requiredTypes: ['specialist'],
            candidate,
            reservations: [
                { resourceId: 'specialist-anna', ...candidate },
                { resourceId: 'specialist-boris', ...candidate },
            ],
        })).toBeNull()
    })
})
