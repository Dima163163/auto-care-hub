import { z } from 'zod'

import {
    createSuperAdminAutoCareMarketSchema,
    createSuperAdminAutoCareMarketZoneSchema,
    createSuperAdminMarketCountrySchema,
    updateSuperAdminAutoCareMarketSchema,
    updateSuperAdminAutoCareMarketHierarchySchema,
    updateSuperAdminAutoCareMarketZoneSchema,
    updateSuperAdminMarketCountrySchema,
} from './admin.schemas.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const countryCreateKeys = [
    'code',
    'names',
    'defaultLocale',
    'supportedLocales',
    'timezone',
    'currencyCode',
    'capabilities',
    'legalLinks',
    'active',
] as const

const countryUpdateKeys = [
    'names',
    'defaultLocale',
    'supportedLocales',
    'timezone',
    'currencyCode',
    'capabilities',
    'legalLinks',
    'active',
] as const

const marketKeys = [
    'cityCode',
    'cityName',
    'regionCode',
    'regionName',
    'centerLatitude',
    'centerLongitude',
    'defaultLocale',
    'supportedLocales',
    'timezone',
    'currencyCode',
    'capabilities',
    'legalLinks',
    'launchReady',
] as const

const legacyMarketUpdateKeys = [
    'defaultLocale',
    'supportedLocales',
    'timezone',
    'currencyCode',
    'capabilities',
    'legalLinks',
    'launchReady',
] as const

const zoneKeys = [
    'parentId',
    'slug',
    'zoneType',
    'names',
    'centerLatitude',
    'centerLongitude',
    'radiusKm',
    'imageUrl',
    'displayOrder',
    'active',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
}

function normalizeStringTree(value: unknown): unknown {
    if (typeof value === 'string') return value.normalize('NFKC').trim()
    if (Array.isArray(value)) return value.map((item) => normalizeStringTree(item))
    if (!isRecord(value)) return value

    return Object.fromEntries(
        Object.entries(value).map(([key, nestedValue]) => [key, normalizeStringTree(nestedValue)]),
    )
}

function parseInput<TSchema extends z.ZodTypeAny>(
    schema: TSchema,
    input: unknown,
    allowedKeys: readonly string[],
): z.infer<TSchema> | null {
    if (!isRecord(input)) return null
    const allowed = new Set(allowedKeys)
    if (Object.keys(input).some((key) => !allowed.has(key))) return null
    const result = schema.safeParse(normalizeStringTree(input))
    return result.success ? result.data : null
}

export type NormalizedSuperAdminMarketCountryCreateInput = z.infer<typeof createSuperAdminMarketCountrySchema>
export type NormalizedSuperAdminMarketCountryUpdateInput = z.infer<typeof updateSuperAdminMarketCountrySchema>
export type NormalizedSuperAdminMarketCreateInput = z.infer<typeof createSuperAdminAutoCareMarketSchema>
export type NormalizedSuperAdminMarketUpdateInput = z.infer<typeof updateSuperAdminAutoCareMarketHierarchySchema>
export type NormalizedSuperAdminMarketZoneCreateInput = z.infer<typeof createSuperAdminAutoCareMarketZoneSchema>
export type NormalizedSuperAdminMarketZoneUpdateInput = z.infer<typeof updateSuperAdminAutoCareMarketZoneSchema>

export function normalizeSuperAdminMarketCountryCreateInput(input: unknown): NormalizedSuperAdminMarketCountryCreateInput | null {
    return parseInput(createSuperAdminMarketCountrySchema, input, countryCreateKeys)
}

export function normalizeSuperAdminMarketCountryUpdateInput(input: unknown): NormalizedSuperAdminMarketCountryUpdateInput | null {
    return parseInput(updateSuperAdminMarketCountrySchema, input, countryUpdateKeys)
}

export function normalizeSuperAdminMarketCreateInput(input: unknown): NormalizedSuperAdminMarketCreateInput | null {
    return parseInput(createSuperAdminAutoCareMarketSchema, input, marketKeys)
}

export function normalizeSuperAdminMarketUpdateInput(input: unknown): NormalizedSuperAdminMarketUpdateInput | null {
    return parseInput(updateSuperAdminAutoCareMarketHierarchySchema, input, marketKeys)
}

export type NormalizedSuperAdminLegacyMarketUpdateInput = z.infer<typeof updateSuperAdminAutoCareMarketSchema>

export function normalizeSuperAdminLegacyMarketUpdateInput(input: unknown): NormalizedSuperAdminLegacyMarketUpdateInput | null {
    return parseInput(updateSuperAdminAutoCareMarketSchema, input, legacyMarketUpdateKeys)
}

export function normalizeSuperAdminMarketZoneCreateInput(input: unknown): NormalizedSuperAdminMarketZoneCreateInput | null {
    return parseInput(createSuperAdminAutoCareMarketZoneSchema, input, zoneKeys)
}

export function normalizeSuperAdminMarketZoneUpdateInput(input: unknown): NormalizedSuperAdminMarketZoneUpdateInput | null {
    return parseInput(updateSuperAdminAutoCareMarketZoneSchema, input, zoneKeys)
}

export function normalizeSuperAdminMarketHierarchyUuid(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return uuidPattern.test(normalized) ? normalized : null
}
