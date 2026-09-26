import { afterEach, describe, expect, it, vi } from 'vitest'

import { getServerPublicProviderProfile } from './server-provider'

const publicProvider = {
    id: 'provider-public-1',
    name: 'Public Auto Service',
    description: 'Public profile description',
    status: 'active',
    verified: true,
    yearsActive: 5,
    staffCount: 3,
    rating: 4.8,
    reviewCount: 12,
    bonusSummary: null,
    phone: null,
    phones: [],
    logoUrl: null,
    coverImageUrl: null,
    galleryImageUrls: [],
    amenityIds: [],
    brandSpecializations: [],
    isMultibrand: true,
    location: { id: 'location-1', marketId: 'market-1', address: 'Public address', hours: '09:00–18:00', latitude: null, longitude: null },
    offers: [{ id: 'offer-public-1', serviceDefinitionId: 'oil-change', serviceSlug: 'oil-change', priceFromMinor: 290000, priceToMinor: null, currencyCode: 'RUB', durationMinutes: 60, inclusions: ['Oil and filter'], warrantyText: null, active: true }],
    ownerId: 'private-owner-id',
    internalModerationNotes: 'private note',
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

describe('server public provider profile', () => {
    it('returns a validated public DTO, keeps published offers, and strips backend-only fields', async () => {
        vi.stubEnv('NEXT_PUBLIC_API_MODE', 'real')
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
            ...publicProvider,
            offers: [...publicProvider.offers, { ...publicProvider.offers[0], id: 'inactive', active: false }],
        }), { status: 200, headers: { 'content-type': 'application/json' } })))

        const result = await getServerPublicProviderProfile(publicProvider.id)

        expect(result).toMatchObject({ notFound: false, profile: { id: publicProvider.id, name: publicProvider.name, offers: [{ id: 'offer-public-1' }] } })
        expect(result.profile).not.toHaveProperty('ownerId')
        expect(result.profile).not.toHaveProperty('internalModerationNotes')
    })

    it('drops unsafe media URLs from the public profile DTO', async () => {
        vi.stubEnv('NEXT_PUBLIC_API_MODE', 'real')
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
            ...publicProvider,
            coverImageUrl: '//tracker.example/image.jpg',
            galleryImageUrls: ['javascript:alert(1)', 'https://cdn.example/image.webp'],
        }), { status: 200 })))

        const result = await getServerPublicProviderProfile(publicProvider.id)

        expect(result.profile?.coverImageUrl).toBeNull()
        expect(result.profile?.galleryImageUrls).toEqual(['https://cdn.example/image.webp'])
    })

    it('treats unavailable or unpublished providers as not found', async () => {
        vi.stubEnv('NEXT_PUBLIC_API_MODE', 'real')
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ...publicProvider, status: 'suspended' }), { status: 200 })))
        await expect(getServerPublicProviderProfile(publicProvider.id)).resolves.toEqual({ profile: null, notFound: true })

        vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })))
        await expect(getServerPublicProviderProfile(publicProvider.id)).resolves.toEqual({ profile: null, notFound: true })
    })

    it('renders public mock profiles on the server without calling the API', async () => {
        vi.stubEnv('NEXT_PUBLIC_API_MODE', 'mock')
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        const result = await getServerPublicProviderProfile('api-proservice-moscow')

        expect(fetchMock).not.toHaveBeenCalled()
        expect(result).toMatchObject({
            notFound: false,
            profile: {
                id: 'api-proservice-moscow',
                name: 'ProService',
                status: 'active',
                location: { address: 'Москва, ул. Льва Толстого, 18' },
                offers: expect.arrayContaining([
                    expect.objectContaining({ serviceSlug: 'oil-change', priceFromMinor: 290000, active: true }),
                ]),
            },
        })
    })

    it('returns not found for unknown mock providers', async () => {
        vi.stubEnv('NEXT_PUBLIC_API_MODE', 'mock')
        await expect(getServerPublicProviderProfile('unknown-provider')).resolves.toEqual({ profile: null, notFound: true })
    })
})
