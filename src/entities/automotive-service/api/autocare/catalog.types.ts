

export type AutoCareApiMarket = {
    id: string
    countryCode: string
    countryName: string
    cityCode: string
    cityName: string
    regionCode: string | null
    regionName: string | null
    centerLatitude: number | null
    centerLongitude: number | null
    currencyCode: string
    defaultLocale: string
    supportedLocales: string[]
    timezone: string
    capabilities: Record<string, boolean>
    legalLinks: Record<string, string>
    launchReady: boolean
}

export type UpdateSuperAdminAutoCareMarketInput = {
    id: string
    defaultLocale: string
    supportedLocales: string[]
    timezone: string
    currencyCode: string
    capabilities?: Record<string, boolean>
    legalLinks?: Record<string, string>
    launchReady: boolean
}

export type AutoCareApiMarketCountry = {
    id: string
    code: string
    names: Record<string, string>
    defaultLocale: string
    supportedLocales: string[]
    timezone: string
    currencyCode: string
    capabilities: Record<string, boolean>
    legalLinks: Record<string, string>
    active: boolean
}

export type SuperAdminMarketHierarchy = AutoCareApiMarketCountry & {
    cities: Array<AutoCareApiMarket & { zones: AutoCareApiLocationZone[] }>
}

export type SuperAdminMarketProfileInput = {
    defaultLocale: string
    supportedLocales: string[]
    timezone: string
    currencyCode: string
    capabilities: Record<string, boolean>
    legalLinks: Record<string, string>
}

export type CreateSuperAdminMarketCountryInput = SuperAdminMarketProfileInput & {
    code: string
    names: Record<string, string>
    active: boolean
}

export type UpdateSuperAdminMarketCountryInput = SuperAdminMarketProfileInput & {
    id: string
    names: Record<string, string>
    active: boolean
}

export type CreateSuperAdminAutoCareMarketInput = SuperAdminMarketProfileInput & {
    countryId: string
    cityCode: string
    cityName: string
    regionCode?: string | null
    regionName?: string | null
    centerLatitude?: number | null
    centerLongitude?: number | null
    launchReady: boolean
}

export type UpdateSuperAdminAutoCareMarketHierarchyInput = Omit<CreateSuperAdminAutoCareMarketInput, 'countryId'> & { id: string }

export type AutoCareApiLocationZone = {
    id: string
    marketId: string
    parentId: string | null
    slug: string
    zoneType: 'district' | 'neighborhood' | 'service_area'
    names: Record<string, string>
    centerLatitude: number | null
    centerLongitude: number | null
    radiusKm: number | null
    imageUrl: string | null
    displayOrder: number
    active: boolean
    serviceCount: number
}

export type CreateSuperAdminAutoCareMarketZoneInput = {
    marketId: string
    parentId?: string | null
    slug: string
    zoneType: 'district' | 'neighborhood' | 'service_area'
    names: Record<string, string>
    centerLatitude?: number | null
    centerLongitude?: number | null
    radiusKm?: number | null
    imageUrl?: string | null
    displayOrder: number
    active: boolean
}

export type UpdateSuperAdminAutoCareMarketZoneInput = Omit<CreateSuperAdminAutoCareMarketZoneInput, 'marketId'> & { id: string }

export type AutoCareApiServiceDefinition = {
    id: string
    slug: string
    categorySlug: string
    labels: Record<string, string>
    priceType: 'fixed' | 'from' | 'range' | 'quote_required'
    comparisonAttributes: string[]
    active: boolean
}

export type UpdateAdminAutoCareServiceDefinitionInput = {
    id: string
    categorySlug: string
    labels: Record<string, string>
    priceType: 'fixed' | 'from' | 'range' | 'quote_required'
    comparisonAttributes: string[]
    active: boolean
}

export type CreateAutoCareCatalogGapRequestInput = {
    providerId?: string | null
    proposedSlug: string
    categorySlug: string
    labels: Record<string, string>
    priceType: 'fixed' | 'from' | 'range' | 'quote_required'
    comparisonAttributes: string[]
    rationale: string
}

export type AutoCareCatalogGapRequest = {
    id: string
    requestedById: string
    providerId: string | null
    proposedSlug: string
    categorySlug: string
    labels: Record<string, string>
    priceType: 'fixed' | 'from' | 'range' | 'quote_required'
    comparisonAttributes: string[]
    rationale: string
    status: 'pending' | 'approved' | 'rejected'
    reviewedById: string | null
    reviewReason: string | null
    reviewedAt: string | null
    createdAt: string
    updatedAt: string
}

export type DecideAutoCareCatalogGapRequestInput = { id: string; status: 'approved' | 'rejected'; reason?: string | null }

export type AutoCareVehicleEngine = {
    id: string
    fuelType: 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'lpg' | 'hydrogen' | 'other'
    displacementL: number | null
    horsepower: number | null
}

export type AutoCareVehicleModel = {
    id: string
    label: string
    yearsFrom: number
    yearsTo: number
    engines: AutoCareVehicleEngine[]
}

export type AutoCareVehicleBrand = {
    id: string
    labels: Record<string, string>
    models: AutoCareVehicleModel[]
}
