import { describe, expect, it } from 'vitest'

import { automotiveServices } from '@/entities/automotive-service'

import { getServiceMarkerIcon } from './serviceMarkerIcons'

describe('service marker icons', () => {
    it('provides an inline SVG for every supported automotive service', () => {
        automotiveServices.forEach((service) => {
            const svg = getServiceMarkerIcon(service.id)
            expect(svg).toMatch(/^<svg /)
            expect(svg).toContain('viewBox="0 0 24 24"')
        })
    })

    it('falls back to a maintenance icon for unknown services', () => {
        expect(getServiceMarkerIcon('unknown-service')).toBe(getServiceMarkerIcon('maintenance'))
    })
})
