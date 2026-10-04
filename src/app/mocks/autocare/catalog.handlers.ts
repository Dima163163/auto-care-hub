import { http, HttpResponse } from "msw"
import { STATIC_DEPLOYMENT_CAPABILITIES } from "@/shared/config/deployment"
import { vehicleCatalog } from "@/entities/automotive-service"
import { isMockEmpty, mockScenarioResponse } from ".././mock-scenario"
import { currentMockUser, hasMockProviderRole, hasMockSuperAdminAccess } from './mock-access'
import { toMockMarket, toMockZone } from './mock-catalog'
import { autoCareDefinitions, autoCareLocationZones, autoCareMarkets, editableAutoCareMarkets, mockAutoCareCatalogGapRequests, superAdminMarketCountries } from './mock-fixtures'
import type { MockAutoCareCatalogGapRequest, MockSuperAdminCountry, MockSuperAdminMarket, MockSuperAdminZone } from './mock-fixtures'
import { invalidMockBodyResponse } from './mock-validation'

export const catalogHandlers = [
{ order: 54, handler: http.get('/api/v1/markets', ({ request }) => mockScenarioResponse(request) ?? HttpResponse.json(isMockEmpty(request) ? [] : editableAutoCareMarkets.filter((market) => market.launchReady).map(toMockMarket))) },
{ order: 55, handler: http.patch('/api/super-admin/markets/:id', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ code: 'UNAUTHORIZED', message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'super_admin') return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can update markets.' }, { status: 403 })
        const market = editableAutoCareMarkets.find((item) => item.id === params.id || item.cityCode === params.id)
        if (!market) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Automotive market not found.' }, { status: 404 })
        const body = await request.json() as Partial<{ defaultLocale: string; supportedLocales: string[]; timezone: string; currencyCode: string; capabilities: Record<string, boolean>; legalLinks: Record<string, string>; launchReady: boolean }>
        const currencyCode = body.currencyCode
        const locales = Array.isArray(body.supportedLocales) ? body.supportedLocales.filter((locale): locale is string => typeof locale === 'string' && locale.trim().length > 0).map((locale) => locale.trim()) : []
        if (typeof body.defaultLocale !== 'string' || locales.length === 0 || !locales.includes(body.defaultLocale) || typeof body.timezone !== 'string' || typeof currencyCode !== 'string' || !/^[A-Z]{3}$/.test(currencyCode) || typeof body.launchReady !== 'boolean') return invalidMockBodyResponse()
        market.defaultLocale = body.defaultLocale.trim()
        market.supportedLocales = [...new Set(locales)]
        market.timezone = body.timezone.trim()
        market.currencyCode = currencyCode
        market.launchReady = body.launchReady
        if (body.capabilities && typeof body.capabilities === 'object') market.capabilities = body.capabilities
        if (body.legalLinks && typeof body.legalLinks === 'object') market.legalLinks = body.legalLinks
        return HttpResponse.json(toMockMarket(market))
    }) },
{ order: 56, handler: http.get('/api/super-admin/market-hierarchy', () => {
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can manage the market hierarchy.' }, { status: 403 })
        return HttpResponse.json(superAdminMarketCountries.map((country) => ({
            ...country,
            cities: editableAutoCareMarkets.filter((market) => market.countryCode === country.code).map((market) => ({
                ...toMockMarket(market),
                zones: (autoCareLocationZones as unknown as MockSuperAdminZone[]).filter((zone) => zone.marketId === market.id).map(toMockZone),
            })),
        })))
    }) },
{ order: 57, handler: http.post('/api/super-admin/market-countries', async ({ request }) => {
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can manage countries.' }, { status: 403 })
        const body = await request.json() as Partial<MockSuperAdminCountry>
        if (!body.code || !/^[A-Z]{2,3}$/.test(body.code) || !body.names || typeof body.names !== 'object' || !body.defaultLocale || !Array.isArray(body.supportedLocales) || !body.timezone || !body.currencyCode || !/^[A-Z]{3}$/.test(body.currencyCode)) return invalidMockBodyResponse()
        if (superAdminMarketCountries.some((country) => country.code === body.code)) return HttpResponse.json({ code: 'CONFLICT', message: 'Country already exists.' }, { status: 409 })
        const country: MockSuperAdminCountry = { id: `country-${body.code.toLowerCase()}-${Date.now()}`, code: body.code, names: body.names, defaultLocale: body.defaultLocale, supportedLocales: body.supportedLocales, timezone: body.timezone, currencyCode: body.currencyCode, capabilities: body.capabilities ?? {}, legalLinks: body.legalLinks ?? {}, active: body.active ?? true }
        superAdminMarketCountries.push(country)
        return HttpResponse.json(country, { status: 201 })
    }) },
{ order: 58, handler: http.patch('/api/super-admin/market-countries/:id', async ({ params, request }) => {
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can manage countries.' }, { status: 403 })
        const country = superAdminMarketCountries.find((item) => item.id === params.id)
        if (!country) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Country not found.' }, { status: 404 })
        const body = await request.json() as Partial<MockSuperAdminCountry>
        if (!body.names || !body.defaultLocale || !Array.isArray(body.supportedLocales) || !body.timezone || !body.currencyCode || !/^[A-Z]{3}$/.test(body.currencyCode) || typeof body.active !== 'boolean') return invalidMockBodyResponse()
        Object.assign(country, { names: body.names, defaultLocale: body.defaultLocale, supportedLocales: body.supportedLocales, timezone: body.timezone, currencyCode: body.currencyCode, capabilities: body.capabilities ?? {}, legalLinks: body.legalLinks ?? {}, active: body.active })
        return HttpResponse.json(country)
    }) },
{ order: 59, handler: http.delete('/api/super-admin/market-countries/:id', ({ params }) => {
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can delete countries.' }, { status: 403 })
        const index = superAdminMarketCountries.findIndex((item) => item.id === params.id)
        if (index < 0) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Country not found.' }, { status: 404 })
        const country = superAdminMarketCountries[index]
        if (editableAutoCareMarkets.some((market) => market.countryCode === country.code)) return HttpResponse.json({ code: 'CONFLICT', message: 'Move or deactivate all cities before deleting this country.' }, { status: 409 })
        superAdminMarketCountries.splice(index, 1)
        return HttpResponse.json({ id: country.id })
    }) },
{ order: 60, handler: http.post('/api/super-admin/market-countries/:id/cities', async ({ params, request }) => {
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can manage cities.' }, { status: 403 })
        const country = superAdminMarketCountries.find((item) => item.id === params.id)
        if (!country) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Country not found.' }, { status: 404 })
        const body = await request.json() as Partial<MockSuperAdminMarket>
        if (!body.cityCode || !/^[a-z0-9][a-z0-9_-]{1,119}$/.test(body.cityCode) || !body.cityName || !body.defaultLocale || !Array.isArray(body.supportedLocales) || !body.timezone || !body.currencyCode || !/^[A-Z]{3}$/.test(body.currencyCode)) return invalidMockBodyResponse()
        if (editableAutoCareMarkets.some((market) => market.cityCode === body.cityCode)) return HttpResponse.json({ code: 'CONFLICT', message: 'City already exists.' }, { status: 409 })
        const city: MockSuperAdminMarket = { id: `market-${body.cityCode}-${Date.now()}`, countryCode: country.code, countryName: country.names[body.defaultLocale] ?? country.names.en ?? country.code, cityCode: body.cityCode, cityName: body.cityName, regionCode: body.regionCode ?? null, regionName: body.regionName ?? null, centerLatitude: body.centerLatitude ?? null, centerLongitude: body.centerLongitude ?? null, currencyCode: body.currencyCode, defaultLocale: body.defaultLocale, supportedLocales: body.supportedLocales, timezone: body.timezone, capabilities: body.capabilities ?? {}, legalLinks: body.legalLinks ?? {}, launchReady: body.launchReady ?? false }
        editableAutoCareMarkets.push(city)
        return HttpResponse.json(toMockMarket(city), { status: 201 })
    }) },
{ order: 61, handler: http.patch('/api/super-admin/market-cities/:id', async ({ params, request }) => {
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can manage cities.' }, { status: 403 })
        const city = editableAutoCareMarkets.find((item) => item.id === params.id)
        if (!city) return HttpResponse.json({ code: 'NOT_FOUND', message: 'City not found.' }, { status: 404 })
        const body = await request.json() as Partial<MockSuperAdminMarket>
        if (!body.cityCode || !body.cityName || !body.defaultLocale || !Array.isArray(body.supportedLocales) || !body.timezone || !body.currencyCode || !/^[A-Z]{3}$/.test(body.currencyCode) || typeof body.launchReady !== 'boolean') return invalidMockBodyResponse()
        Object.assign(city, { cityCode: body.cityCode, cityName: body.cityName, regionCode: body.regionCode ?? null, regionName: body.regionName ?? null, centerLatitude: body.centerLatitude ?? null, centerLongitude: body.centerLongitude ?? null, currencyCode: body.currencyCode, defaultLocale: body.defaultLocale, supportedLocales: body.supportedLocales, timezone: body.timezone, capabilities: body.capabilities ?? {}, legalLinks: body.legalLinks ?? {}, launchReady: body.launchReady })
        return HttpResponse.json(toMockMarket(city))
    }) },
{ order: 62, handler: http.delete('/api/super-admin/market-cities/:id', ({ params }) => {
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can delete cities.' }, { status: 403 })
        const index = editableAutoCareMarkets.findIndex((item) => item.id === params.id)
        if (index < 0) return HttpResponse.json({ code: 'NOT_FOUND', message: 'City not found.' }, { status: 404 })
        const city = editableAutoCareMarkets[index]
        const zones = autoCareLocationZones as unknown as MockSuperAdminZone[]
        if (zones.some((zone) => zone.marketId === city.id)) return HttpResponse.json({ code: 'CONFLICT', message: 'Remove all zones before deleting this city.' }, { status: 409 })
        editableAutoCareMarkets.splice(index, 1)
        return HttpResponse.json({ id: city.id })
    }) },
{ order: 63, handler: http.post('/api/super-admin/market-cities/:id/zones', async ({ params, request }) => {
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can manage zones.' }, { status: 403 })
        if (!editableAutoCareMarkets.some((item) => item.id === params.id)) return HttpResponse.json({ code: 'NOT_FOUND', message: 'City not found.' }, { status: 404 })
        const body = await request.json() as Partial<MockSuperAdminZone>
        if (!body.slug || !/^[a-z0-9][a-z0-9_-]{1,119}$/.test(body.slug) || !body.names || typeof body.names !== 'object' || !['district', 'neighborhood', 'service_area'].includes(body.zoneType ?? '')) return invalidMockBodyResponse()
        const zones = autoCareLocationZones as unknown as MockSuperAdminZone[]
        if (zones.some((zone) => zone.marketId === params.id && zone.slug === body.slug)) return HttpResponse.json({ code: 'CONFLICT', message: 'Zone already exists.' }, { status: 409 })
        const zone: MockSuperAdminZone = { id: `zone-${String(params.id)}-${body.slug}-${Date.now()}`, marketId: String(params.id), parentId: body.parentId ?? null, slug: body.slug, zoneType: body.zoneType!, names: body.names, centerLatitude: body.centerLatitude ?? null, centerLongitude: body.centerLongitude ?? null, radiusKm: body.radiusKm ?? null, imageUrl: body.imageUrl ?? null, displayOrder: body.displayOrder ?? zones.filter((item) => item.marketId === params.id).length, active: body.active ?? true, serviceCount: 0 }
        zones.push(zone)
        return HttpResponse.json(toMockZone(zone), { status: 201 })
    }) },
{ order: 64, handler: http.patch('/api/super-admin/market-zones/:id', async ({ params, request }) => {
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can manage zones.' }, { status: 403 })
        const zone = (autoCareLocationZones as unknown as MockSuperAdminZone[]).find((item) => item.id === params.id)
        if (!zone) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Zone not found.' }, { status: 404 })
        const body = await request.json() as Partial<MockSuperAdminZone>
        if (!body.slug || !body.names || typeof body.names !== 'object' || !['district', 'neighborhood', 'service_area'].includes(body.zoneType ?? '') || typeof body.displayOrder !== 'number' || typeof body.active !== 'boolean') return invalidMockBodyResponse()
        Object.assign(zone, { parentId: body.parentId ?? null, slug: body.slug, zoneType: body.zoneType, names: body.names, centerLatitude: body.centerLatitude ?? null, centerLongitude: body.centerLongitude ?? null, radiusKm: body.radiusKm ?? null, imageUrl: body.imageUrl ?? null, displayOrder: body.displayOrder, active: body.active })
        return HttpResponse.json(toMockZone(zone))
    }) },
{ order: 65, handler: http.delete('/api/super-admin/market-zones/:id', ({ params }) => {
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can delete zones.' }, { status: 403 })
        const zones = autoCareLocationZones as unknown as MockSuperAdminZone[]
        const index = zones.findIndex((item) => item.id === params.id)
        if (index < 0) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Zone not found.' }, { status: 404 })
        const zone = zones[index]
        if (zones.some((item) => item.parentId === zone.id)) return HttpResponse.json({ code: 'CONFLICT', message: 'Move child zones before deleting this zone.' }, { status: 409 })
        zones.splice(index, 1)
        return HttpResponse.json({ id: zone.id })
    }) },
{ order: 66, handler: http.get('/api/v1/deployment-capabilities', () => HttpResponse.json(STATIC_DEPLOYMENT_CAPABILITIES)) },
{ order: 67, handler: http.get('/api/v1/markets/:marketId/zones', ({ params, request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const market = autoCareMarkets.find((item) => item.id === params.marketId || item.cityCode === params.marketId)
        const requestedLimit = Number(new URL(request.url).searchParams.get('limit') ?? 24)
        const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(Math.floor(requestedLimit), 100) : 24
        return HttpResponse.json(isMockEmpty(request) ? [] : autoCareLocationZones.filter((zone) => zone.marketId === market?.id).slice(0, limit))
    }) },
{ order: 68, handler: http.get('/api/v1/service-definitions', () => HttpResponse.json(autoCareDefinitions)) },
{ order: 69, handler: http.patch('/api/admin/service-definitions/:id', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ code: 'UNAUTHORIZED', message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'admin' && user.role !== 'super_admin') return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only administrators can update service definitions.' }, { status: 403 })
        const definition = autoCareDefinitions.find((item) => item.id === params.id)
        if (!definition) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Automotive service definition not found.' }, { status: 404 })
        const body = await request.json() as Partial<{ categorySlug: string; labels: Record<string, string>; priceType: 'fixed' | 'from' | 'range' | 'quote_required'; comparisonAttributes: string[]; active: boolean }>
        if (typeof body.categorySlug !== 'string' || !body.categorySlug.trim() || !body.labels || typeof body.labels !== 'object' || !body.priceType || !Array.isArray(body.comparisonAttributes) || typeof body.active !== 'boolean') return invalidMockBodyResponse()
        definition.categorySlug = body.categorySlug.trim()
        definition.labels = body.labels
        definition.priceType = body.priceType
        definition.comparisonAttributes = body.comparisonAttributes.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
        definition.active = body.active
        return HttpResponse.json(definition)
    }) },
{ order: 70, handler: http.post('/api/v1/catalog-gap-requests', async ({ request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const body = await request.json() as Partial<MockAutoCareCatalogGapRequest>
        if (typeof body.providerId === 'string' && !hasMockProviderRole(user.id, body.providerId, ['owner', 'manager'])) return HttpResponse.json({ message: 'You cannot submit a catalog request for this provider.' }, { status: 403 })
        if (typeof body.proposedSlug !== 'string' || !/^[a-z0-9][a-z0-9_-]{1,119}$/.test(body.proposedSlug) || typeof body.categorySlug !== 'string' || !body.labels || typeof body.labels !== 'object' || !body.rationale || typeof body.rationale !== 'string' || body.rationale.trim().length < 10) return invalidMockBodyResponse()
        if (mockAutoCareCatalogGapRequests.some((item) => item.proposedSlug === body.proposedSlug && item.status === 'pending')) return HttpResponse.json({ message: 'A catalog request for this service is already pending.' }, { status: 409 })
        const now = new Date().toISOString()
        const item: MockAutoCareCatalogGapRequest = { id: `catalog-gap-${Date.now()}`, requestedById: user.id, providerId: typeof body.providerId === 'string' ? body.providerId : null, proposedSlug: body.proposedSlug, categorySlug: body.categorySlug, labels: body.labels as Record<string, string>, priceType: body.priceType ?? 'quote_required', comparisonAttributes: body.comparisonAttributes ?? [], rationale: body.rationale.trim(), status: 'pending', reviewedById: null, reviewReason: null, reviewedAt: null, createdAt: now, updatedAt: now }
        mockAutoCareCatalogGapRequests.unshift(item)
        return HttpResponse.json(item, { status: 201 })
    }) },
{ order: 75, handler: http.get('/api/v1/vehicle-catalog', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const brandId = new URL(request.url).searchParams.get('brandId')
        return HttpResponse.json(isMockEmpty(request) ? [] : brandId ? vehicleCatalog.filter((brand) => brand.id === brandId) : vehicleCatalog)
    }) },
{ order: 200, handler: http.get('/api/admin/catalog-gap-requests', ({ request }) => {
        const user = currentMockUser()
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const searchParams = new URL(request.url).searchParams
        const status = searchParams.get('status')
        return HttpResponse.json(mockAutoCareCatalogGapRequests.filter((item) => !status || item.status === status))
    }) },
{ order: 201, handler: http.patch('/api/admin/catalog-gap-requests/:id/decision', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const body = await request.json() as { status?: unknown; reason?: unknown }
        if (body.status !== 'approved' && body.status !== 'rejected') return invalidMockBodyResponse()
        if (body.status === 'rejected' && (typeof body.reason !== 'string' || body.reason.trim().length === 0)) return HttpResponse.json({ message: 'A rejection reason is required.' }, { status: 422 })
        const item = mockAutoCareCatalogGapRequests.find((candidate) => candidate.id === params.id)
        if (!item) return HttpResponse.json({ message: 'Catalog gap request not found.' }, { status: 404 })
        if (item.status !== 'pending') return HttpResponse.json({ message: 'Catalog gap request has already been decided.' }, { status: 409 })
        if (body.status === 'approved' && autoCareDefinitions.some((definition) => definition.slug === item.proposedSlug)) return HttpResponse.json({ message: 'A service with this slug already exists.' }, { status: 409 })
        if (body.status === 'approved') autoCareDefinitions.push({ id: `definition-${Date.now()}`, slug: item.proposedSlug, categorySlug: item.categorySlug, labels: item.labels, priceType: item.priceType, comparisonAttributes: item.comparisonAttributes, active: true })
        item.status = body.status
        item.reviewedById = user.id
        item.reviewReason = typeof body.reason === 'string' ? body.reason.trim() || null : null
        item.reviewedAt = new Date().toISOString()
        item.updatedAt = item.reviewedAt
        return HttpResponse.json(item)
    }) }
]
