import type { z } from 'zod'

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
import type {
    createSuperAdminAutoCareMarketSchema,
    createSuperAdminAutoCareMarketZoneSchema,
    createSuperAdminMarketCountrySchema,
    updateSuperAdminAutoCareMarketHierarchySchema,
    updateSuperAdminAutoCareMarketZoneSchema,
    updateSuperAdminMarketCountrySchema,
} from './admin.schemas.js'

type CreateCountryInput = z.infer<typeof createSuperAdminMarketCountrySchema>
type UpdateCountryInput = z.infer<typeof updateSuperAdminMarketCountrySchema>
type CreateMarketInput = z.infer<typeof createSuperAdminAutoCareMarketSchema>
type UpdateMarketInput = z.infer<typeof updateSuperAdminAutoCareMarketHierarchySchema>
type CreateZoneInput = z.infer<typeof createSuperAdminAutoCareMarketZoneSchema>
type UpdateZoneInput = z.infer<typeof updateSuperAdminAutoCareMarketZoneSchema>

function assertSuperAdmin(actor: UserEntity) {
    if (!isSuperAdmin(actor)) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only super admin can manage market hierarchy.' })
    }
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

export async function createSuperAdminMarketCountry(actor: UserEntity, input: CreateCountryInput): Promise<AutoCareMarketCountryResponse> {
    assertSuperAdmin(actor)
    const repository = AppDataSource.getRepository(AutomotiveMarketCountryEntity)
    const exists = await repository.existsBy({ code: input.code })
    if (exists) {
        throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Market country code already exists.' })
    }
    const saved = await repository.save(repository.create({
        code: input.code,
        names: input.names,
        defaultLocale: input.defaultLocale,
        supportedLocales: input.supportedLocales,
        timezone: input.timezone,
        currencyCode: input.currencyCode,
        capabilities: input.capabilities,
        legalLinks: input.legalLinks,
        active: input.active,
    }))
    return toMarketCountryResponse(saved)
}

export async function updateSuperAdminMarketCountry(actor: UserEntity, countryId: string, input: UpdateCountryInput): Promise<AutoCareMarketCountryResponse> {
    assertSuperAdmin(actor)
    const repository = AppDataSource.getRepository(AutomotiveMarketCountryEntity)
    const country = await repository.findOneBy({ id: countryId })
    if (!country) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Market country not found.' })
    }
    Object.assign(country, input)
    return toMarketCountryResponse(await repository.save(country))
}

export async function deleteSuperAdminMarketCountry(actor: UserEntity, countryId: string): Promise<{ id: string }> {
    assertSuperAdmin(actor)
    const country = await getCountryOrFail(countryId)
    const marketCount = await AppDataSource.getRepository(AutomotiveMarketEntity).countBy({ countryId: country.id })
    if (marketCount > 0) {
        throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Move or deactivate all cities before deleting this country.' })
    }
    await AppDataSource.getRepository(AutomotiveMarketCountryEntity).remove(country)
    return { id: country.id }
}

async function getCountryOrFail(countryId: string) {
    const country = await AppDataSource.getRepository(AutomotiveMarketCountryEntity).findOneBy({ id: countryId })
    if (!country) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Market country not found.' })
    }
    return country
}

export async function createSuperAdminAutoCareMarket(actor: UserEntity, countryId: string, input: CreateMarketInput): Promise<AutoCareMarketResponse> {
    assertSuperAdmin(actor)
    const country = await getCountryOrFail(countryId)
    const marketRepository = AppDataSource.getRepository(AutomotiveMarketEntity)
    const exists = await marketRepository.existsBy({ countryCode: country.code, cityCode: input.cityCode })
    if (exists) {
        throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Market city code already exists for this country.' })
    }
    const saved = await marketRepository.save(marketRepository.create({
        countryId: country.id,
        countryCode: country.code,
        countryName: countryDisplayName(country),
        cityCode: input.cityCode,
        cityName: input.cityName,
        regionCode: input.regionCode ?? null,
        regionName: input.regionName ?? null,
        centerLatitude: input.centerLatitude ?? null,
        centerLongitude: input.centerLongitude ?? null,
        currencyCode: input.currencyCode,
        defaultLocale: input.defaultLocale,
        supportedLocales: input.supportedLocales,
        timezone: input.timezone,
        capabilities: input.capabilities,
        legalLinks: input.legalLinks,
        launchReady: input.launchReady,
    }))
    return toMarketResponse(saved)
}

export async function updateSuperAdminAutoCareMarketHierarchy(actor: UserEntity, marketId: string, input: UpdateMarketInput): Promise<AutoCareMarketResponse> {
    assertSuperAdmin(actor)
    const repository = AppDataSource.getRepository(AutomotiveMarketEntity)
    const market = await repository.findOneBy({ id: marketId })
    if (!market) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive market not found.' })
    }
    Object.assign(market, {
        cityCode: input.cityCode,
        cityName: input.cityName,
        regionCode: input.regionCode ?? null,
        regionName: input.regionName ?? null,
        centerLatitude: input.centerLatitude ?? null,
        centerLongitude: input.centerLongitude ?? null,
        currencyCode: input.currencyCode,
        defaultLocale: input.defaultLocale,
        supportedLocales: input.supportedLocales,
        timezone: input.timezone,
        capabilities: input.capabilities,
        legalLinks: input.legalLinks,
        launchReady: input.launchReady,
    })
    return toMarketResponse(await repository.save(market))
}

export async function deleteSuperAdminAutoCareMarket(actor: UserEntity, marketId: string): Promise<{ id: string }> {
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

async function getMarketOrFail(marketId: string) {
    const market = await AppDataSource.getRepository(AutomotiveMarketEntity).findOneBy({ id: marketId })
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

export async function createSuperAdminAutoCareMarketZone(actor: UserEntity, marketId: string, input: CreateZoneInput): Promise<AutoCareLocationZoneResponse> {
    assertSuperAdmin(actor)
    await getMarketOrFail(marketId)
    await assertValidZoneParent(marketId, input.parentId)
    const repository = AppDataSource.getRepository(AutomotiveLocationZoneEntity)
    const exists = await repository.existsBy({ marketId, slug: input.slug })
    if (exists) {
        throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Market zone slug already exists.' })
    }
    const saved = await repository.save(repository.create({
        marketId,
        parentId: input.parentId ?? null,
        slug: input.slug,
        zoneType: input.zoneType,
        names: input.names,
        centerLatitude: input.centerLatitude ?? null,
        centerLongitude: input.centerLongitude ?? null,
        radiusKm: input.radiusKm ?? null,
        imageUrl: input.imageUrl ?? null,
        displayOrder: input.displayOrder,
        active: input.active,
    }))
    return toLocationZoneResponse(saved, 0)
}

export async function updateSuperAdminAutoCareMarketZone(actor: UserEntity, zoneId: string, input: UpdateZoneInput): Promise<AutoCareLocationZoneResponse> {
    assertSuperAdmin(actor)
    const repository = AppDataSource.getRepository(AutomotiveLocationZoneEntity)
    const zone = await repository.findOneBy({ id: zoneId })
    if (!zone) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Market zone not found.' })
    }
    await assertValidZoneParent(zone.marketId, input.parentId, zone.id)
    const duplicate = await repository.createQueryBuilder('zone')
        .where('zone.marketId = :marketId', { marketId: zone.marketId })
        .andWhere('zone.slug = :slug', { slug: input.slug })
        .andWhere('zone.id <> :zoneId', { zoneId: zone.id })
        .getExists()
    if (duplicate) {
        throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Market zone slug already exists.' })
    }
    Object.assign(zone, {
        parentId: input.parentId ?? null,
        slug: input.slug,
        zoneType: input.zoneType,
        names: input.names,
        centerLatitude: input.centerLatitude ?? null,
        centerLongitude: input.centerLongitude ?? null,
        radiusKm: input.radiusKm ?? null,
        imageUrl: input.imageUrl ?? null,
        displayOrder: input.displayOrder,
        active: input.active,
    })
    return toLocationZoneResponse(await repository.save(zone), 0)
}

export async function deleteSuperAdminAutoCareMarketZone(actor: UserEntity, zoneId: string): Promise<{ id: string }> {
    assertSuperAdmin(actor)
    const repository = AppDataSource.getRepository(AutomotiveLocationZoneEntity)
    const zone = await repository.findOneBy({ id: zoneId })
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
