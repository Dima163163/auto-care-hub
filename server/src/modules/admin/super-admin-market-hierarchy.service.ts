import { AppDataSource } from '../../database/data-source.js'
import {
    AutomotiveLocationZoneEntity,
    AutomotiveMarketCountryEntity,
    AutomotiveMarketEntity,
    AutomotiveServiceLocationEntity,
} from '../../entities/index.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import { isSuperAdmin } from '../../shared/auth/roles.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import {
    toLocationZoneResponse,
    toMarketCountryResponse,
    toMarketResponse,
} from '../autocare/autocare.mappers.js'
import type {
    AutoCareLocationZoneResponse,
    AutoCareMarketCountryResponse,
    AutoCareMarketResponse,
    SuperAdminMarketHierarchyResponse,
} from '../autocare/autocare.types.js'
import {
    normalizeSuperAdminMarketCountryCreateInput,
    normalizeSuperAdminMarketCountryUpdateInput,
    normalizeSuperAdminMarketCreateInput,
    normalizeSuperAdminMarketHierarchyUuid,
    normalizeSuperAdminMarketUpdateInput,
    normalizeSuperAdminMarketZoneCreateInput,
    normalizeSuperAdminMarketZoneUpdateInput,
} from './super-admin-market-hierarchy-policy.js'

function assertSuperAdmin(actor: UserEntity) {
    if (!isSuperAdmin(actor)) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only super admin can manage market hierarchy.' })
    }
}

function requireHierarchyUuid(value: unknown, field: string) {
    const normalized = normalizeSuperAdminMarketHierarchyUuid(value)
    if (!normalized) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: `${field} must be a valid UUID.` })
    }
    return normalized
}

function requireHierarchyInput<T>(input: unknown, normalize: (value: unknown) => T | null, message: string): T {
    const normalized = normalize(input)
    if (!normalized) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message })
    }
    return normalized
}

function countryDisplayName(country: AutomotiveMarketCountryEntity) {
    return country.names[country.defaultLocale] ?? country.names.en ?? Object.values(country.names)[0] ?? country.code
}

function toHierarchyCountry(
    country: AutomotiveMarketCountryEntity,
    markets: AutomotiveMarketEntity[],
    zonesByMarketId: Map<string, AutoCareLocationZoneResponse[]>,
): SuperAdminMarketHierarchyResponse {
    return {
        ...toMarketCountryResponse(country),
        cities: markets
            .filter((market) => market.countryId === country.id)
            .sort((left, right) => left.cityName.localeCompare(right.cityName))
            .map((market) => ({
                ...toMarketResponse(market),
                zones: zonesByMarketId.get(market.id) ?? [],
            })),
    }
}

export async function getSuperAdminMarketHierarchy(actor: UserEntity): Promise<SuperAdminMarketHierarchyResponse[]> {
    assertSuperAdmin(actor)
    const [countries, markets, zones] = await Promise.all([
        AppDataSource.getRepository(AutomotiveMarketCountryEntity).find({ order: { code: 'ASC' } }),
        AppDataSource.getRepository(AutomotiveMarketEntity).find({ order: { cityName: 'ASC' } }),
        AppDataSource.getRepository(AutomotiveLocationZoneEntity).find({ order: { displayOrder: 'ASC', slug: 'ASC' } }),
    ])
    const zonesByMarketId = new Map<string, AutoCareLocationZoneResponse[]>()
    for (const zone of zones) {
        const existing = zonesByMarketId.get(zone.marketId) ?? []
        existing.push(toLocationZoneResponse(zone, 0))
        zonesByMarketId.set(zone.marketId, existing)
    }
    return countries.map((country) => toHierarchyCountry(country, markets, zonesByMarketId))
}

export async function createSuperAdminMarketCountry(actor: UserEntity, input: unknown): Promise<AutoCareMarketCountryResponse> {
    assertSuperAdmin(actor)
    const normalizedInput = requireHierarchyInput(input, normalizeSuperAdminMarketCountryCreateInput, 'Market country payload is invalid.')
    const repository = AppDataSource.getRepository(AutomotiveMarketCountryEntity)
    const exists = await repository.existsBy({ code: normalizedInput.code })
    if (exists) {
        throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Market country code already exists.' })
    }
    const saved = await repository.save(repository.create({
        code: normalizedInput.code,
        names: normalizedInput.names,
        defaultLocale: normalizedInput.defaultLocale,
        supportedLocales: normalizedInput.supportedLocales,
        timezone: normalizedInput.timezone,
        currencyCode: normalizedInput.currencyCode,
        capabilities: normalizedInput.capabilities,
        legalLinks: normalizedInput.legalLinks,
        active: normalizedInput.active,
    }))
    return toMarketCountryResponse(saved)
}

export async function updateSuperAdminMarketCountry(actor: UserEntity, countryId: unknown, input: unknown): Promise<AutoCareMarketCountryResponse> {
    assertSuperAdmin(actor)
    const normalizedCountryId = requireHierarchyUuid(countryId, 'Market country id')
    const normalizedInput = requireHierarchyInput(input, normalizeSuperAdminMarketCountryUpdateInput, 'Market country payload is invalid.')
    const repository = AppDataSource.getRepository(AutomotiveMarketCountryEntity)
    const country = await repository.findOneBy({ id: normalizedCountryId })
    if (!country) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Market country not found.' })
    }
    Object.assign(country, normalizedInput)
    return toMarketCountryResponse(await repository.save(country))
}

export async function deleteSuperAdminMarketCountry(actor: UserEntity, countryId: unknown): Promise<{ id: string }> {
    assertSuperAdmin(actor)
    const country = await getCountryOrFail(countryId)
    const marketCount = await AppDataSource.getRepository(AutomotiveMarketEntity).countBy({ countryId: country.id })
    if (marketCount > 0) {
        throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Move or deactivate all cities before deleting this country.' })
    }
    await AppDataSource.getRepository(AutomotiveMarketCountryEntity).remove(country)
    return { id: country.id }
}

async function getCountryOrFail(countryId: unknown) {
    const normalizedCountryId = requireHierarchyUuid(countryId, 'Market country id')
    const country = await AppDataSource.getRepository(AutomotiveMarketCountryEntity).findOneBy({ id: normalizedCountryId })
    if (!country) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Market country not found.' })
    }
    return country
}

export async function createSuperAdminAutoCareMarket(actor: UserEntity, countryId: unknown, input: unknown): Promise<AutoCareMarketResponse> {
    assertSuperAdmin(actor)
    const normalizedInput = requireHierarchyInput(input, normalizeSuperAdminMarketCreateInput, 'Market city payload is invalid.')
    const country = await getCountryOrFail(countryId)
    const marketRepository = AppDataSource.getRepository(AutomotiveMarketEntity)
    const exists = await marketRepository.existsBy({ countryCode: country.code, cityCode: normalizedInput.cityCode })
    if (exists) {
        throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Market city code already exists for this country.' })
    }
    const saved = await marketRepository.save(marketRepository.create({
        countryId: country.id,
        countryCode: country.code,
        countryName: countryDisplayName(country),
        cityCode: normalizedInput.cityCode,
        cityName: normalizedInput.cityName,
        regionCode: normalizedInput.regionCode ?? null,
        regionName: normalizedInput.regionName ?? null,
        centerLatitude: normalizedInput.centerLatitude ?? null,
        centerLongitude: normalizedInput.centerLongitude ?? null,
        currencyCode: normalizedInput.currencyCode,
        defaultLocale: normalizedInput.defaultLocale,
        supportedLocales: normalizedInput.supportedLocales,
        timezone: normalizedInput.timezone,
        capabilities: normalizedInput.capabilities,
        legalLinks: normalizedInput.legalLinks,
        launchReady: normalizedInput.launchReady,
    }))
    return toMarketResponse(saved)
}

export async function updateSuperAdminAutoCareMarketHierarchy(actor: UserEntity, marketId: unknown, input: unknown): Promise<AutoCareMarketResponse> {
    assertSuperAdmin(actor)
    const normalizedMarketId = requireHierarchyUuid(marketId, 'Market id')
    const normalizedInput = requireHierarchyInput(input, normalizeSuperAdminMarketUpdateInput, 'Market city payload is invalid.')
    const repository = AppDataSource.getRepository(AutomotiveMarketEntity)
    const market = await repository.findOneBy({ id: normalizedMarketId })
    if (!market) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive market not found.' })
    }
    Object.assign(market, {
        cityCode: normalizedInput.cityCode,
        cityName: normalizedInput.cityName,
        regionCode: normalizedInput.regionCode ?? null,
        regionName: normalizedInput.regionName ?? null,
        centerLatitude: normalizedInput.centerLatitude ?? null,
        centerLongitude: normalizedInput.centerLongitude ?? null,
        currencyCode: normalizedInput.currencyCode,
        defaultLocale: normalizedInput.defaultLocale,
        supportedLocales: normalizedInput.supportedLocales,
        timezone: normalizedInput.timezone,
        capabilities: normalizedInput.capabilities,
        legalLinks: normalizedInput.legalLinks,
        launchReady: normalizedInput.launchReady,
    })
    return toMarketResponse(await repository.save(market))
}

export async function deleteSuperAdminAutoCareMarket(actor: UserEntity, marketId: unknown): Promise<{ id: string }> {
    assertSuperAdmin(actor)
    const market = await getMarketOrFail(marketId)
    const [zoneCount, locationCount] = await Promise.all([
        AppDataSource.getRepository(AutomotiveLocationZoneEntity).countBy({ marketId: market.id }),
        AppDataSource.getRepository(AutomotiveServiceLocationEntity).countBy({ marketId: market.id }),
    ])
    if (zoneCount > 0 || locationCount > 0) {
        throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Remove all zones and service locations before deleting this city.' })
    }
    await AppDataSource.getRepository(AutomotiveMarketEntity).remove(market)
    return { id: market.id }
}

async function getMarketOrFail(marketId: unknown) {
    const normalizedMarketId = requireHierarchyUuid(marketId, 'Market id')
    const market = await AppDataSource.getRepository(AutomotiveMarketEntity).findOneBy({ id: normalizedMarketId })
    if (!market) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive market not found.' })
    }
    return market
}

async function assertValidZoneParent(marketId: string, parentId: string | null | undefined, zoneId?: string) {
    if (!parentId) return
    if (parentId === zoneId) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'A zone cannot be its own parent.' })
    }
    const parent = await AppDataSource.getRepository(AutomotiveLocationZoneEntity).findOneBy({ id: parentId, marketId })
    if (!parent) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Zone parent must belong to the same market.' })
    }
}

export async function createSuperAdminAutoCareMarketZone(actor: UserEntity, marketId: unknown, input: unknown): Promise<AutoCareLocationZoneResponse> {
    assertSuperAdmin(actor)
    const normalizedInput = requireHierarchyInput(input, normalizeSuperAdminMarketZoneCreateInput, 'Market zone payload is invalid.')
    const market = await getMarketOrFail(marketId)
    const normalizedMarketId = market.id
    const parentId = normalizedInput.parentId ? requireHierarchyUuid(normalizedInput.parentId, 'Zone parent id') : null
    await assertValidZoneParent(normalizedMarketId, parentId)
    const repository = AppDataSource.getRepository(AutomotiveLocationZoneEntity)
    const exists = await repository.existsBy({ marketId: normalizedMarketId, slug: normalizedInput.slug })
    if (exists) {
        throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Market zone slug already exists.' })
    }
    const saved = await repository.save(repository.create({
        marketId: normalizedMarketId,
        parentId,
        slug: normalizedInput.slug,
        zoneType: normalizedInput.zoneType,
        names: normalizedInput.names,
        centerLatitude: normalizedInput.centerLatitude ?? null,
        centerLongitude: normalizedInput.centerLongitude ?? null,
        radiusKm: normalizedInput.radiusKm ?? null,
        imageUrl: normalizedInput.imageUrl ?? null,
        displayOrder: normalizedInput.displayOrder,
        active: normalizedInput.active,
    }))
    return toLocationZoneResponse(saved, 0)
}

export async function updateSuperAdminAutoCareMarketZone(actor: UserEntity, zoneId: unknown, input: unknown): Promise<AutoCareLocationZoneResponse> {
    assertSuperAdmin(actor)
    const normalizedZoneId = requireHierarchyUuid(zoneId, 'Market zone id')
    const normalizedInput = requireHierarchyInput(input, normalizeSuperAdminMarketZoneUpdateInput, 'Market zone payload is invalid.')
    const repository = AppDataSource.getRepository(AutomotiveLocationZoneEntity)
    const zone = await repository.findOneBy({ id: normalizedZoneId })
    if (!zone) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Market zone not found.' })
    }
    const parentId = normalizedInput.parentId ? requireHierarchyUuid(normalizedInput.parentId, 'Zone parent id') : null
    await assertValidZoneParent(zone.marketId, parentId, zone.id)
    const duplicate = await repository.createQueryBuilder('zone')
        .where('zone.marketId = :marketId', { marketId: zone.marketId })
        .andWhere('zone.slug = :slug', { slug: normalizedInput.slug })
        .andWhere('zone.id <> :zoneId', { zoneId: zone.id })
        .getExists()
    if (duplicate) {
        throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Market zone slug already exists.' })
    }
    Object.assign(zone, {
        parentId,
        slug: normalizedInput.slug,
        zoneType: normalizedInput.zoneType,
        names: normalizedInput.names,
        centerLatitude: normalizedInput.centerLatitude ?? null,
        centerLongitude: normalizedInput.centerLongitude ?? null,
        radiusKm: normalizedInput.radiusKm ?? null,
        imageUrl: normalizedInput.imageUrl ?? null,
        displayOrder: normalizedInput.displayOrder,
        active: normalizedInput.active,
    })
    return toLocationZoneResponse(await repository.save(zone), 0)
}

export async function deleteSuperAdminAutoCareMarketZone(actor: UserEntity, zoneId: unknown): Promise<{ id: string }> {
    assertSuperAdmin(actor)
    const normalizedZoneId = requireHierarchyUuid(zoneId, 'Market zone id')
    const repository = AppDataSource.getRepository(AutomotiveLocationZoneEntity)
    const zone = await repository.findOneBy({ id: normalizedZoneId })
    if (!zone) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Market zone not found.' })
    }
    const [childCount, locationCount] = await Promise.all([
        repository.countBy({ parentId: zone.id }),
        AppDataSource.getRepository(AutomotiveServiceLocationEntity).countBy({ zoneId: zone.id }),
    ])
    if (childCount > 0 || locationCount > 0) {
        throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Move child zones and service locations before deleting this zone.' })
    }
    await repository.remove(zone)
    return { id: zone.id }
}
