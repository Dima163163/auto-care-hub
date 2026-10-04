import { z } from 'zod'
import type { AutoCareApiLocationZone, AutoCareApiMarket, AutoCareApiMarketCountry, AutoCareCatalogGapRequest, SuperAdminMarketHierarchy } from './catalog.types'

export const autoCareCatalogGapRequestSchema = z.object({
    id: z.string(), requestedById: z.string(), providerId: z.string().nullable(), proposedSlug: z.string(), categorySlug: z.string(),
    labels: z.record(z.string(), z.string()), priceType: z.enum(['fixed', 'from', 'range', 'quote_required']), comparisonAttributes: z.array(z.string()), rationale: z.string(),
    status: z.enum(['pending', 'approved', 'rejected']), reviewedById: z.string().nullable(), reviewReason: z.string().nullable(), reviewedAt: z.string().nullable(), createdAt: z.string(), updatedAt: z.string(),
}).passthrough() satisfies z.ZodType<AutoCareCatalogGapRequest>

export const autoCareMarketsSchema = z.array(z.object({
    id: z.string(), countryCode: z.string(), countryName: z.string(), cityCode: z.string(), cityName: z.string(),
    regionCode: z.string().nullable(), regionName: z.string().nullable(), centerLatitude: z.number().finite().nullable(), centerLongitude: z.number().finite().nullable(),
    currencyCode: z.string().min(3), defaultLocale: z.string(), supportedLocales: z.array(z.string()), timezone: z.string(), capabilities: z.record(z.string(), z.boolean()).default({}), legalLinks: z.record(z.string(), z.string()).default({}), launchReady: z.boolean(),
}).passthrough()) satisfies z.ZodType<AutoCareApiMarket[]>

export const autoCareLocationZonesSchema = z.array(z.object({
    id: z.string(), marketId: z.string(), parentId: z.string().nullable(), slug: z.string(), zoneType: z.enum(['district', 'neighborhood', 'service_area']), names: z.record(z.string(), z.string()),
    centerLatitude: z.number().finite().nullable(), centerLongitude: z.number().finite().nullable(), radiusKm: z.number().finite().nullable(), imageUrl: z.string().nullable(), displayOrder: z.number().int().default(0), active: z.boolean().default(true), serviceCount: z.number().int().nonnegative(),
}).passthrough()) satisfies z.ZodType<AutoCareApiLocationZone[]>

export const autoCareMarketCountrySchema = z.object({
    id: z.string(), code: z.string(), names: z.record(z.string(), z.string()), defaultLocale: z.string(), supportedLocales: z.array(z.string()), timezone: z.string(), currencyCode: z.string().min(3), capabilities: z.record(z.string(), z.boolean()), legalLinks: z.record(z.string(), z.string()), active: z.boolean(),
}).passthrough() satisfies z.ZodType<AutoCareApiMarketCountry>

export const superAdminMarketHierarchySchema = autoCareMarketCountrySchema.extend({
    cities: z.array(autoCareMarketsSchema.element.extend({ zones: autoCareLocationZonesSchema })),
}).passthrough() satisfies z.ZodType<SuperAdminMarketHierarchy>
