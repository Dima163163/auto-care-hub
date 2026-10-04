import { createHash } from 'node:crypto'
import { type EntityManager } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveMarketEntity, AutomotiveMarketCountryEntity, AutomotiveLocationZoneEntity, AutomotiveProviderEntity, AutomotiveProviderStatus, AutomotiveServiceLocationEntity, AutomotiveProviderMembershipEntity, AutomotiveProviderMembershipRole } from '../../entities/index.js'
import { type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { queueProviderDocumentModerationEvidence, queueProviderMediaModerationEvidence } from './moderation-evidence.service.js'
import { ensureDefaultAutoCareResources } from './capacity-resource.service.js'
import { toProviderResponse } from './autocare.mappers.js'
import { normalizeAutoCareProviderPublicMediaForWrite } from './autocare-public-media-policy.js'
import { normalizeAutoCareProviderLocationIds } from './provider-location-input-policy.js'
import { ownerAutoCareProviderSchema } from './autocare.schemas.js'
import { assertOwner } from './provider-guards.js'

type OwnerAutoCareLocationInput = {
    countryCode?: string
    countryName?: string
    cityName?: string
    currencyCode?: string
    timezone?: string
}

function buildOwnerMarketCityCode(countryCode: string, cityName: string) {
    const normalizedCityName = cityName.normalize('NFKC').trim().toLocaleLowerCase()
    const slug = normalizedCityName
        .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100) || 'city'
    const suffix = createHash('sha256').update(`${countryCode}:${normalizedCityName}`).digest('hex').slice(0, 8)
    return `${slug}-${suffix}`.slice(0, 120)
}

async function findOrCreateOwnerMarket(manager: EntityManager, input: OwnerAutoCareLocationInput) {
    const countryCode = input.countryCode?.trim().toUpperCase()
    const countryName = input.countryName?.trim()
    const cityName = input.cityName?.trim()
    if (!countryCode || !countryName || !cityName) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Country code, country name and city name are required.' })
    }

    const timezone = input.timezone?.trim() || 'UTC'
    const currencyCode = input.currencyCode?.trim().toUpperCase() || 'USD'
    const countryRepository = manager.getRepository(AutomotiveMarketCountryEntity)
    let country = await countryRepository.findOneBy({ code: countryCode })
    if (!country) {
        country = await countryRepository.save(countryRepository.create({
            code: countryCode,
            names: { en: countryName, ru: countryName },
            defaultLocale: 'en',
            supportedLocales: ['en', 'ru'],
            timezone,
            currencyCode,
            capabilities: {},
            legalLinks: {},
            active: true,
        }))
    }

    const marketRepository = manager.getRepository(AutomotiveMarketEntity)
    const existingMarket = await marketRepository.createQueryBuilder('market')
        .where('market.countryCode = :countryCode', { countryCode })
        .andWhere('LOWER(market.cityName) = LOWER(:cityName)', { cityName })
        .getOne()
    if (existingMarket) return existingMarket

    const canonicalCountryName = country.names.en ?? country.names.ru ?? countryName

    return marketRepository.save(marketRepository.create({
        countryId: country.id,
        countryCode,
        countryName: canonicalCountryName,
        cityCode: buildOwnerMarketCityCode(countryCode, cityName),
        cityName,
        regionCode: null,
        regionName: null,
        centerLatitude: null,
        centerLongitude: null,
        currencyCode,
        defaultLocale: 'en',
        supportedLocales: ['en', 'ru'],
        timezone,
        capabilities: {},
        legalLinks: {},
        // Creating an owner draft must not publish a market. Super-admin
        // review is the only action that can mark a market launch-ready.
        launchReady: false,
    }))
}

export async function createOwnerAutoCareProvider(owner: UserEntity, input: unknown) {
    const normalizedLocationIds = normalizeAutoCareProviderLocationIds(input)
    if (!normalizedLocationIds) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Market and zone ids must be valid UUIDs.' })
    const schemaInput = input && typeof input === 'object' && !Array.isArray(input)
        ? {
            ...(input as Record<string, unknown>),
            ...(normalizedLocationIds.marketId ? { marketId: normalizedLocationIds.marketId, zoneId: normalizedLocationIds.zoneId } : {}),
        }
        : input
    const parsedInput = ownerAutoCareProviderSchema.safeParse(schemaInput)
    if (!parsedInput.success) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Provider profile payload is invalid.' })
    const normalizedInput = parsedInput.data
    assertOwner(owner)
    const publicMedia = normalizeAutoCareProviderPublicMediaForWrite(normalizedInput)
    if (!publicMedia) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Provider media references are invalid.' })
    const existingMarket = normalizedLocationIds.marketId
        ? await AppDataSource.getRepository(AutomotiveMarketEntity).findOneBy({ id: normalizedLocationIds.marketId })
        : null
    if (normalizedLocationIds.marketId && !existingMarket) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive market not found.' })
    const existingZone = normalizedLocationIds.zoneId && existingMarket
        ? await AppDataSource.getRepository(AutomotiveLocationZoneEntity).findOneBy({ id: normalizedLocationIds.zoneId, marketId: existingMarket.id, active: true })
        : null
    if (normalizedLocationIds.zoneId && !existingZone) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'The selected service zone does not belong to this market.' })

    const phones = [...new Set((normalizedInput.phones ?? []).map((phone) => phone.trim()).filter(Boolean))]
    if (phones.length === 0 && normalizedInput.phone?.trim()) phones.push(normalizedInput.phone.trim())

    return AppDataSource.transaction(async (manager) => {
        const market = existingMarket ?? await findOrCreateOwnerMarket(manager, normalizedInput)
        const zone = existingZone
        const provider = await manager.getRepository(AutomotiveProviderEntity).save(manager.getRepository(AutomotiveProviderEntity).create({
            ownerId: owner.id,
            name: normalizedInput.name,
            description: normalizedInput.description ?? null,
            status: AutomotiveProviderStatus.Draft,
            verified: false,
            yearsActive: normalizedInput.yearsActive,
            staffCount: normalizedInput.staffCount,
            workstationCount: normalizedInput.workstationCount ?? 0,
            teamSize: normalizedInput.teamSize ?? 'small_team',
            businessType: normalizedInput.businessType ?? 'company',
            chatEnabled: normalizedInput.chatEnabled ?? true,
            communicationMode: normalizedInput.communicationMode ?? 'online',
            responseWindowMinutes: normalizedInput.responseWindowMinutes ?? 240,
            responseHours: normalizedInput.responseHours ?? 'working_hours',
            phoneBookingEnabled: normalizedInput.phoneBookingEnabled ?? true,
            callbackEnabled: normalizedInput.callbackEnabled ?? true,
            requestPhotosEnabled: normalizedInput.requestPhotosEnabled ?? true,
            publicContactNote: normalizedInput.publicContactNote ?? null,
            phone: phones[0] ?? normalizedInput.phone ?? null,
            phones,
            email: normalizedInput.email ?? null,
            websiteUrl: normalizedInput.websiteUrl ?? null,
            metroStation: normalizedInput.metroStation ?? null,
            warrantyText: normalizedInput.warrantyText ?? null,
            bonusSummary: normalizedInput.bonusSummary ?? null,
            logoUrl: publicMedia.logoUrl,
            coverImageUrl: publicMedia.coverImageUrl,
            galleryImageUrls: publicMedia.galleryImageUrls,
            amenityIds: [...new Set(normalizedInput.amenityIds)],
            brandSpecializations: [...new Set(normalizedInput.brandSpecializations)],
            isMultibrand: normalizedInput.isMultibrand,
        }))
        const location = await manager.getRepository(AutomotiveServiceLocationEntity).save(manager.getRepository(AutomotiveServiceLocationEntity).create({
            providerId: provider.id,
            marketId: market.id,
            zoneId: zone?.id ?? null,
            address: normalizedInput.address,
            hours: normalizedInput.hours,
            appointmentCapacity: normalizedInput.appointmentCapacity ?? Math.max(1, normalizedInput.workstationCount ?? 1),
            timezone: normalizedInput.timezone ?? market.timezone,
            weeklySchedule: normalizedInput.weeklySchedule ?? undefined,
            blackoutDates: normalizedInput.blackoutDates ?? [],
            latitude: null,
            longitude: null,
        }))
        await ensureDefaultAutoCareResources(manager, {
            providerId: provider.id,
            locationId: location.id,
            specialists: Math.max(1, normalizedInput.staffCount),
            bays: Math.max(1, normalizedInput.workstationCount ?? normalizedInput.appointmentCapacity ?? 1),
            lifts: Math.max(0, normalizedInput.workstationCount ?? 0),
        })
        await manager.getRepository(AutomotiveProviderMembershipEntity).save(manager.getRepository(AutomotiveProviderMembershipEntity).create({
            providerId: provider.id,
            userId: owner.id,
            locationId: null,
            role: AutomotiveProviderMembershipRole.Owner,
        }))
        await queueProviderMediaModerationEvidence(manager, provider)
        await queueProviderDocumentModerationEvidence(manager, provider.id, normalizedInput.documents ?? [])

        return toProviderResponse(provider, location)
    })
}
