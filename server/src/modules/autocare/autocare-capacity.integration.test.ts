import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutomotiveBookingMode,
    AutomotiveMarketCountryEntity,
    AutomotiveMarketEntity,
    AutomotivePriceType,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
    AutoCareChatThreadEntity,
    AutoCareRepairEventEntity,
    OutboxEventEntity,
    ServiceRequestEntity,
    ServiceRequestStatus,
} from '../../entities/index.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import {
    confirmOwnerAutoCareServiceRequest,
    createAutoCareServiceRequest,
} from './autocare-request.service.js'

describe('AutoCare appointment capacity integration', () => {
    const suffix = `${Date.now()}`
    const createdRequestIds: string[] = []
    let owner: UserEntity
    let client: UserEntity
    let country: AutomotiveMarketCountryEntity
    let market: AutomotiveMarketEntity
    let provider: AutomotiveProviderEntity
    let location: AutomotiveServiceLocationEntity
    let definition: AutomotiveServiceDefinitionEntity
    let offering: AutomotiveServiceOfferingEntity

    beforeAll(async () => {
        const userRepository = AppDataSource.getRepository(UserEntity)
        owner = await userRepository.save(userRepository.create({
            name: 'Capacity Owner',
            email: `capacity-owner-${suffix}@example.com`,
            role: UserRole.Owner,
            status: UserStatus.Active,
            passwordHash: 'hash',
            emailVerifiedAt: new Date(),
        }))
        client = await userRepository.save(userRepository.create({
            name: 'Capacity Client',
            email: `capacity-client-${suffix}@example.com`,
            role: UserRole.Client,
            status: UserStatus.Active,
            passwordHash: 'hash',
            emailVerifiedAt: new Date(),
        }))
        country = await AppDataSource.getRepository(AutomotiveMarketCountryEntity).save(
            AppDataSource.getRepository(AutomotiveMarketCountryEntity).create({
                code: `ZZ-${suffix}`,
                names: { en: 'Capacity Test' },
                defaultLocale: 'en',
                supportedLocales: ['en'],
                timezone: 'UTC',
                currencyCode: 'USD',
                capabilities: {},
                legalLinks: {},
                active: true,
            }),
        )
        market = await AppDataSource.getRepository(AutomotiveMarketEntity).save(
            AppDataSource.getRepository(AutomotiveMarketEntity).create({
                countryId: country.id,
                countryCode: 'ZZ',
                countryName: 'Capacity Test',
                cityCode: `capacity-${suffix}`,
                cityName: 'Capacity Test',
                regionCode: null,
                regionName: null,
                centerLatitude: null,
                centerLongitude: null,
                currencyCode: 'USD',
                defaultLocale: 'en',
                supportedLocales: ['en'],
                timezone: 'UTC',
                launchReady: false,
            }),
        )
        provider = await AppDataSource.getRepository(AutomotiveProviderEntity).save(
            AppDataSource.getRepository(AutomotiveProviderEntity).create({
                ownerId: owner.id,
                name: `Capacity Garage ${suffix}`,
                description: null,
                status: AutomotiveProviderStatus.Active,
                verified: false,
                yearsActive: 0,
                staffCount: 1,
                rating: 0,
                reviewCount: 0,
                workstationCount: 1,
            }),
        )
        location = await AppDataSource.getRepository(AutomotiveServiceLocationEntity).save(
            AppDataSource.getRepository(AutomotiveServiceLocationEntity).create({
                providerId: provider.id,
                marketId: market.id,
                zoneId: null,
                address: 'Capacity street, 1',
                hours: '08:00-21:00',
                appointmentCapacity: 1,
                timezone: 'UTC',
                weeklySchedule: {
                    mon: { open: '08:00', close: '21:00', closed: false },
                    tue: { open: '08:00', close: '21:00', closed: false },
                    wed: { open: '08:00', close: '21:00', closed: false },
                    thu: { open: '08:00', close: '21:00', closed: false },
                    fri: { open: '08:00', close: '21:00', closed: false },
                    sat: { open: '08:00', close: '21:00', closed: false },
                    sun: { open: '08:00', close: '21:00', closed: false },
                },
                blackoutDates: [],
                latitude: null,
                longitude: null,
                supportsMobile: false,
                supportsPickup: false,
                coverageRadiusKm: null,
                dispatchBasePriceMinor: 0,
                etaMinutes: null,
            }),
        )
        definition = await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).save(
            AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).create({
                slug: `capacity-oil-${suffix}`,
                categorySlug: 'maintenance',
                labels: { en: 'Capacity oil service' },
                priceType: AutomotivePriceType.From,
                comparisonAttributes: [],
                active: true,
            }),
        )
        offering = await AppDataSource.getRepository(AutomotiveServiceOfferingEntity).save(
            AppDataSource.getRepository(AutomotiveServiceOfferingEntity).create({
                locationId: location.id,
                definitionId: definition.id,
                description: null,
                priceFromMinor: 1_000,
                priceToMinor: null,
                currencyCode: 'USD',
                durationMinutes: 60,
                inclusions: [],
                warrantyText: null,
                active: true,
                bookingMode: AutomotiveBookingMode.Request,
            }),
        )
    })

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return
        if (createdRequestIds.length > 0) {
            await AppDataSource.getRepository(OutboxEventEntity)
                .createQueryBuilder()
                .delete()
                .where(`"payload" -> 'metadata' ->> 'serviceRequestId' IN (:...requestIds)`, { requestIds: createdRequestIds })
                .execute()
            await AppDataSource.getRepository(AutoCareRepairEventEntity)
                .createQueryBuilder()
                .delete()
                .where('"requestId" IN (:...requestIds)', { requestIds: createdRequestIds })
                .execute()
            await AppDataSource.getRepository(AutoCareChatThreadEntity)
                .createQueryBuilder()
                .delete()
                .where('"requestId" IN (:...requestIds)', { requestIds: createdRequestIds })
                .execute()
            await AppDataSource.getRepository(ServiceRequestEntity)
                .createQueryBuilder()
                .delete()
                .where('id IN (:...requestIds)', { requestIds: createdRequestIds })
                .execute()
        }
        if (offering) await AppDataSource.getRepository(AutomotiveServiceOfferingEntity).delete({ id: offering.id })
        if (definition) await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).delete({ id: definition.id })
        if (location) await AppDataSource.getRepository(AutomotiveServiceLocationEntity).delete({ id: location.id })
        if (provider) await AppDataSource.getRepository(AutomotiveProviderEntity).delete({ id: provider.id })
        if (market) await AppDataSource.getRepository(AutomotiveMarketEntity).delete({ id: market.id })
        if (country) await AppDataSource.getRepository(AutomotiveMarketCountryEntity).delete({ id: country.id })
        if (owner) await AppDataSource.getRepository(UserEntity).delete({ id: owner.id })
        if (client) await AppDataSource.getRepository(UserEntity).delete({ id: client.id })
    })

    it('allows only one concurrent confirmation when a branch capacity is one', async () => {
        const preferredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000)
        preferredAt.setUTCHours(10, 0, 0, 0)
        const requestRepository = AppDataSource.getRepository(ServiceRequestEntity)
        const requests = await requestRepository.save([1, 2].map(() => requestRepository.create({
            clientId: client.id,
            providerId: provider.id,
            locationId: location.id,
            definitionId: definition.id,
            offeringId: offering.id,
            offeringSnapshot: {
                serviceSlug: definition.slug,
                serviceLabels: definition.labels,
                description: null,
                priceFromMinor: offering.priceFromMinor,
                priceToMinor: null,
                currencyCode: offering.currencyCode,
                durationMinutes: offering.durationMinutes,
                inclusions: [],
                warrantyText: null,
                priceType: definition.priceType,
                bookingMode: offering.bookingMode,
            },
            vehicleSnapshot: null,
            contactSnapshot: {},
            preferredAt,
            note: null,
            idempotencyKey: null,
            status: ServiceRequestStatus.AwaitingReply,
            clientConfirmedAt: new Date(),
            providerConfirmedAt: null,
        })))
        createdRequestIds.push(...requests.map(({ id }) => id))

        const results = await Promise.allSettled(
            requests.map((request) => confirmOwnerAutoCareServiceRequest(owner, request.id)),
        )
        const fulfilled = results.filter((result) => result.status === 'fulfilled')
        const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')

        expect(fulfilled).toHaveLength(1)
        expect(rejected).toHaveLength(1)
        expect(rejected[0]?.reason).toBeInstanceOf(AppError)
        expect((rejected[0]?.reason as AppError).statusCode).toBe(409)
        expect(await requestRepository.countBy({ locationId: location.id, status: ServiceRequestStatus.Accepted })).toBe(1)
    })

    it('allows only one concurrent instant booking for the same branch capacity', async () => {
        offering.bookingMode = AutomotiveBookingMode.Instant
        await AppDataSource.getRepository(AutomotiveServiceOfferingEntity).save(offering)
        const preferredAt = new Date(Date.now() + 8 * 24 * 60 * 60 * 1_000)
        preferredAt.setUTCHours(14, 0, 0, 0)

        const results = await Promise.allSettled([1, 2].map((index) => createAutoCareServiceRequest(client, {
            providerId: provider.id,
            locationId: location.id,
            offeringId: offering.id,
            preferredAt: preferredAt.toISOString(),
            contactSnapshot: { name: 'Capacity Client', phone: '+10000000000' },
            note: `Instant capacity test ${index}`,
            idempotencyKey: `capacity-instant-${suffix}-${index}`,
        })))
        const fulfilled = results.filter((result): result is PromiseFulfilledResult<{ id: string }> => result.status === 'fulfilled')
        const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        createdRequestIds.push(...fulfilled.map((result) => result.value.id))

        expect(fulfilled).toHaveLength(1)
        expect(rejected).toHaveLength(1)
        expect(rejected[0]?.reason).toBeInstanceOf(AppError)
        expect((rejected[0]?.reason as AppError).statusCode).toBe(409)

        const acceptedAtSlot = await AppDataSource.getRepository(ServiceRequestEntity).find({
            where: { locationId: location.id, status: ServiceRequestStatus.Accepted },
        })
        expect(acceptedAtSlot.filter((request) => request.preferredAt?.getTime() === preferredAt.getTime())).toHaveLength(1)
    })
})
