import { z } from 'zod'
import { autoCareCatalogGapRequestSchema, autoCareLocationZonesSchema, autoCareMarketCountrySchema, autoCareMarketsSchema, superAdminMarketHierarchySchema } from './catalog.schemas'
import type { AutoCareApiLocationZone, AutoCareApiMarket, AutoCareApiMarketCountry, AutoCareApiServiceDefinition, AutoCareCatalogGapRequest, AutoCareVehicleBrand, CreateAutoCareCatalogGapRequestInput, CreateSuperAdminAutoCareMarketInput, CreateSuperAdminAutoCareMarketZoneInput, CreateSuperAdminMarketCountryInput, DecideAutoCareCatalogGapRequestInput, SuperAdminMarketHierarchy, UpdateAdminAutoCareServiceDefinitionInput, UpdateSuperAdminAutoCareMarketHierarchyInput, UpdateSuperAdminAutoCareMarketInput, UpdateSuperAdminAutoCareMarketZoneInput, UpdateSuperAdminMarketCountryInput } from './catalog.types'
import type { DeleteSuperAdminResourceResponse } from './governance.types'
import type { AutoCareEndpointBuilder } from './endpoint-builder'

export function createCatalogEndpoints(build: AutoCareEndpointBuilder) {
    return {
getAutoCareMarkets: build.query<AutoCareApiMarket[], void>({
            query: () => '/v1/markets',
            transformResponse: (value: unknown) => autoCareMarketsSchema.parse(value),
            providesTags: [{ type: 'AutoCareMarket', id: 'LIST' }],
        }),
updateSuperAdminAutoCareMarket: build.mutation<AutoCareApiMarket, UpdateSuperAdminAutoCareMarketInput>({
            query: ({ id, ...body }) => ({ url: `/super-admin/markets/${encodeURIComponent(id)}`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareMarketsSchema.element.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarket', id: 'LIST' }],
        }),
getSuperAdminMarketHierarchy: build.query<SuperAdminMarketHierarchy[], void>({
            query: () => '/super-admin/market-hierarchy',
            transformResponse: (value: unknown) => z.array(superAdminMarketHierarchySchema).parse(value),
            providesTags: [{ type: 'AutoCareMarket', id: 'HIERARCHY' }],
        }),
createSuperAdminMarketCountry: build.mutation<AutoCareApiMarketCountry, CreateSuperAdminMarketCountryInput>({
            query: (body) => ({ url: '/super-admin/market-countries', method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareMarketCountrySchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarket', id: 'HIERARCHY' }, { type: 'AutoCareMarket', id: 'LIST' }],
        }),
updateSuperAdminMarketCountry: build.mutation<AutoCareApiMarketCountry, UpdateSuperAdminMarketCountryInput>({
            query: ({ id, ...body }) => ({ url: `/super-admin/market-countries/${encodeURIComponent(id)}`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareMarketCountrySchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarket', id: 'HIERARCHY' }, { type: 'AutoCareMarket', id: 'LIST' }],
        }),
deleteSuperAdminMarketCountry: build.mutation<DeleteSuperAdminResourceResponse, string>({
            query: (id) => ({ url: `/super-admin/market-countries/${encodeURIComponent(id)}`, method: 'DELETE' }),
            transformResponse: (value: unknown) => z.object({ id: z.string() }).parse(value),
            invalidatesTags: [{ type: 'AutoCareMarket', id: 'HIERARCHY' }, { type: 'AutoCareMarket', id: 'LIST' }],
        }),
createSuperAdminAutoCareMarket: build.mutation<AutoCareApiMarket, CreateSuperAdminAutoCareMarketInput>({
            query: ({ countryId, ...body }) => ({ url: `/super-admin/market-countries/${encodeURIComponent(countryId)}/cities`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareMarketsSchema.element.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarket', id: 'HIERARCHY' }, { type: 'AutoCareMarket', id: 'LIST' }],
        }),
updateSuperAdminAutoCareMarketHierarchy: build.mutation<AutoCareApiMarket, UpdateSuperAdminAutoCareMarketHierarchyInput>({
            query: ({ id, ...body }) => ({ url: `/super-admin/market-cities/${encodeURIComponent(id)}`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareMarketsSchema.element.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarket', id: 'HIERARCHY' }, { type: 'AutoCareMarket', id: 'LIST' }],
        }),
deleteSuperAdminAutoCareMarket: build.mutation<DeleteSuperAdminResourceResponse, string>({
            query: (id) => ({ url: `/super-admin/market-cities/${encodeURIComponent(id)}`, method: 'DELETE' }),
            transformResponse: (value: unknown) => z.object({ id: z.string() }).parse(value),
            invalidatesTags: [{ type: 'AutoCareMarket', id: 'HIERARCHY' }, { type: 'AutoCareMarket', id: 'LIST' }],
        }),
createSuperAdminAutoCareMarketZone: build.mutation<AutoCareApiLocationZone, CreateSuperAdminAutoCareMarketZoneInput>({
            query: ({ marketId, ...body }) => ({ url: `/super-admin/market-cities/${encodeURIComponent(marketId)}/zones`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareLocationZonesSchema.element.parse(value),
            invalidatesTags: (_result, _error, { marketId }) => [{ type: 'AutoCareMarket', id: 'HIERARCHY' }, { type: 'AutoCareMarket', id: `ZONES_${marketId}` }],
        }),
updateSuperAdminAutoCareMarketZone: build.mutation<AutoCareApiLocationZone, UpdateSuperAdminAutoCareMarketZoneInput>({
            query: ({ id, ...body }) => ({ url: `/super-admin/market-zones/${encodeURIComponent(id)}`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareLocationZonesSchema.element.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarket', id: 'HIERARCHY' }],
        }),
deleteSuperAdminAutoCareMarketZone: build.mutation<DeleteSuperAdminResourceResponse, string>({
            query: (id) => ({ url: `/super-admin/market-zones/${encodeURIComponent(id)}`, method: 'DELETE' }),
            transformResponse: (value: unknown) => z.object({ id: z.string() }).parse(value),
            invalidatesTags: [{ type: 'AutoCareMarket', id: 'HIERARCHY' }],
        }),
getAutoCareLocationZones: build.query<AutoCareApiLocationZone[], { marketId: string; parentId?: string; limit?: number }>({
            query: ({ marketId, ...params }) => ({ url: `/v1/markets/${encodeURIComponent(marketId)}/zones`, params }),
            transformResponse: (value: unknown) => autoCareLocationZonesSchema.parse(value),
            providesTags: (_result, _error, { marketId }) => [{ type: 'AutoCareMarket', id: `ZONES_${marketId}` }],
        }),
getAutoCareServiceDefinitions: build.query<AutoCareApiServiceDefinition[], void>({
            query: () => '/v1/service-definitions',
            transformResponse: (value: unknown) => z.array(z.object({ id: z.string(), slug: z.string(), categorySlug: z.string(), labels: z.record(z.string(), z.string()), priceType: z.enum(['fixed', 'from', 'range', 'quote_required']), comparisonAttributes: z.array(z.string()), active: z.boolean() }).passthrough()).parse(value),
            providesTags: [{ type: 'AutoCareServiceDefinition', id: 'LIST' }],
        }),
updateAdminAutoCareServiceDefinition: build.mutation<AutoCareApiServiceDefinition, UpdateAdminAutoCareServiceDefinitionInput>({
            query: ({ id, ...body }) => ({ url: `/admin/service-definitions/${encodeURIComponent(id)}`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => z.object({ id: z.string(), slug: z.string(), categorySlug: z.string(), labels: z.record(z.string(), z.string()), priceType: z.enum(['fixed', 'from', 'range', 'quote_required']), comparisonAttributes: z.array(z.string()), active: z.boolean() }).parse(value),
            invalidatesTags: [{ type: 'AutoCareServiceDefinition', id: 'LIST' }],
        }),
createAutoCareCatalogGapRequest: build.mutation<AutoCareCatalogGapRequest, CreateAutoCareCatalogGapRequestInput>({
            query: (body) => ({ url: '/v1/catalog-gap-requests', method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareCatalogGapRequestSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareServiceDefinition', id: 'LIST' }],
        }),
getAdminCatalogGapRequests: build.query<AutoCareCatalogGapRequest[], { status?: AutoCareCatalogGapRequest['status'] } | void>({
            query: (params) => ({ url: '/admin/catalog-gap-requests', params: params ?? undefined }),
            transformResponse: (value: unknown) => z.array(autoCareCatalogGapRequestSchema).parse(value),
            providesTags: [{ type: 'AutoCareServiceDefinition', id: 'GAP_QUEUE' }],
        }),
decideAdminCatalogGapRequest: build.mutation<AutoCareCatalogGapRequest, DecideAutoCareCatalogGapRequestInput>({
            query: ({ id, ...body }) => ({ url: `/admin/catalog-gap-requests/${encodeURIComponent(id)}/decision`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareCatalogGapRequestSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareServiceDefinition', id: 'GAP_QUEUE' }, { type: 'AutoCareServiceDefinition', id: 'LIST' }],
        }),
getVehicleCatalog: build.query<AutoCareVehicleBrand[], string | void>({
            query: (brandId) => ({ url: '/v1/vehicle-catalog', params: brandId ? { brandId } : undefined }),
            transformResponse: (value: unknown) => z.array(z.object({ id: z.string(), labels: z.record(z.string(), z.string()), models: z.array(z.object({ id: z.string(), label: z.string(), yearsFrom: z.number().int(), yearsTo: z.number().int(), engines: z.array(z.object({ id: z.string(), fuelType: z.enum(['petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'hydrogen', 'other']), displacementL: z.number().finite().nullable(), horsepower: z.number().finite().nullable() }).passthrough()) }).passthrough()) }).passthrough()).parse(value),
            providesTags: [{ type: 'AutoCareVehicleCatalog', id: 'LIST' }],
        })
    }
}
