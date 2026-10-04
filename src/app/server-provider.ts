import { z } from 'zod'

import type { AutoCareApiProviderProfile } from '@/entities/automotive-service/api/autocareApi'

function normalizePublicMediaUrl(value: string) {
    const candidate = value.trim()
    if (!candidate) return null
    if (candidate.startsWith('/') && !candidate.startsWith('//')) return candidate
    try {
        const url = new URL(candidate)
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
    } catch {
        return null
    }
}

const publicMediaUrlSchema = z.string().nullable().transform((value) => value === null ? null : normalizePublicMediaUrl(value))

const locationSchema = z.object({
    id: z.string(),
    marketId: z.string(),
    zoneId: z.string().nullable().optional(),
    address: z.string(),
    hours: z.string(),
    appointmentCapacity: z.number().int().positive().optional(),
    timezone: z.string().optional(),
    weeklySchedule: z.record(z.string(), z.object({ open: z.string(), close: z.string(), closed: z.boolean() })).optional(),
    blackoutDates: z.array(z.string()).optional(),
    latitude: z.number().finite().nullable(),
    longitude: z.number().finite().nullable(),
    supportsMobile: z.boolean().optional(),
    supportsPickup: z.boolean().optional(),
    coverageRadiusKm: z.number().finite().nullable().optional(),
})

const offerSchema = z.object({
    id: z.string(),
    serviceDefinitionId: z.string(),
    serviceSlug: z.string().optional(),
    serviceLabels: z.record(z.string(), z.string()).optional(),
    description: z.string().nullable().optional(),
    priceFromMinor: z.number().int().nonnegative().max(10_000_000_000),
    priceToMinor: z.number().int().nonnegative().max(10_000_000_000).nullable(),
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    durationMinutes: z.number().int().nonnegative(),
    inclusions: z.array(z.string()),
    warrantyText: z.string().nullable(),
    active: z.boolean(),
    priceType: z.enum(['fixed', 'from', 'range', 'quote_required']).optional(),
    bookingMode: z.enum(['request', 'instant']).optional(),
})

const providerProfileSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    status: z.enum(['draft', 'active', 'suspended']),
    verified: z.boolean(),
    yearsActive: z.number().finite(),
    staffCount: z.number().finite(),
    rating: z.number().min(0).max(5),
    reviewCount: z.number().int().nonnegative(),
    bonusSummary: z.string().nullable(),
    phone: z.string().nullable().optional(),
    phones: z.array(z.string().trim().min(5).max(32)).max(5).default([]),
    email: z.string().nullable().optional(),
    websiteUrl: z.string().nullable().optional(),
    metroStation: z.string().nullable().optional(),
    workstationCount: z.number().int().nonnegative().optional(),
    teamSize: z.enum(['solo', 'small_team', 'team', 'enterprise']).optional(),
    businessType: z.enum(['sole_proprietor', 'self_employed', 'company', 'private_master', 'other']).optional(),
    chatEnabled: z.boolean().optional(),
    communicationMode: z.enum(['online', 'request_then_confirm', 'phone_only']).optional(),
    responseWindowMinutes: z.number().int().nonnegative().nullable().optional(),
    responseHours: z.enum(['working_hours', 'always_on']).optional(),
    phoneBookingEnabled: z.boolean().optional(),
    callbackEnabled: z.boolean().optional(),
    requestPhotosEnabled: z.boolean().optional(),
    publicContactNote: z.string().nullable().optional(),
    warrantyText: z.string().nullable().optional(),
    logoUrl: publicMediaUrlSchema,
    coverImageUrl: publicMediaUrlSchema,
    galleryImageUrls: z.array(z.string()).transform((values) => values.map(normalizePublicMediaUrl).filter((value): value is string => value !== null)),
    amenityIds: z.array(z.string()),
    brandSpecializations: z.array(z.string()),
    isMultibrand: z.boolean(),
    location: locationSchema,
    trustScore: z.number().finite().optional(),
    trustBadge: z.string().nullable().optional(),
    trustReassessedAt: z.string().nullable().optional(),
    offers: z.array(offerSchema),
    locations: z.array(z.object({ location: locationSchema, offers: z.array(offerSchema) })).optional(),
})

export type ServerPublicProviderProfile = AutoCareApiProviderProfile


export async function getServerPublicProviderProfile(providerId: string): Promise<{ profile: ServerPublicProviderProfile | null; notFound: boolean }> {
    // Local mock mode has no server API available during the initial Next.js
    // request. Reuse the same public fixture source as MSW so the route can
    // render a real profile on the first response as well as after hydration.
    if (process.env.NEXT_PUBLIC_API_MODE !== 'real') {
        const { getMockPublicProvider } = await import('./server-provider-mock')
        const mockValue = getMockPublicProvider(providerId)
        if (!mockValue) return { profile: null, notFound: true }
        const parsed = providerProfileSchema.safeParse(mockValue)
        if (!parsed.success || parsed.data.status !== 'active') return { profile: null, notFound: true }
        const offers = parsed.data.offers.filter((offer) => offer.active)
        if (offers.length === 0) return { profile: null, notFound: true }
        return { profile: { ...parsed.data, offers }, notFound: false }
    }

    const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://127.0.0.1:4000'
    const profileUrl = new URL(`/v1/providers/${encodeURIComponent(providerId)}`, apiOrigin)

    try {
        const response = await fetch(profileUrl, { next: { revalidate: 300 }, signal: AbortSignal.timeout(5_000) })
        if (response.status === 404) return { profile: null, notFound: true }
        if (!response.ok) return { profile: null, notFound: false }

        const value: unknown = await response.json()
        const parsed = providerProfileSchema.safeParse(value)
        if (!parsed.success) return { profile: null, notFound: false }
        if (parsed.data.status !== 'active') return { profile: null, notFound: true }

        const offers = parsed.data.offers.filter((offer) => offer.active)
        const locations = parsed.data.locations?.map((entry) => ({
            ...entry,
            offers: entry.offers.filter((offer) => offer.active),
        }))
        // A public profile without any published offer is not a useful or
        // indexable page. Keep the behaviour consistent with the public API.
        if (offers.length === 0) return { profile: null, notFound: true }

        return {
            profile: { ...parsed.data, offers, ...(locations ? { locations } : {}) },
            notFound: false,
        }
    } catch {
        return { profile: null, notFound: false }
    }
}
