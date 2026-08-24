import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareBonusAccountEntity,
    AutoCareBonusLedgerEntity,
    AutoCareBonusLedgerType,
    AutomotiveMarketCountryEntity,
    AutomotiveMarketEntity,
    AutomotivePriceType,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    ServiceRequestEntity,
    ServiceRequestStatus,
} from '../../entities/index.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import {
    getMyAutoCareBonusAccounts,
    redeemAutoCareBonus,
    refundAutoCareBonusForCancelledRequest,
} from './autocare-bonus.service.js'

describe('AutoCare bonus transaction invariants', () => {
    const suffix = `${Date.now()}`
    let client: UserEntity
    let country: AutomotiveMarketCountryEntity
    let market: AutomotiveMarketEntity
    let provider: AutomotiveProviderEntity
    let location: AutomotiveServiceLocationEntity
    let definition: AutomotiveServiceDefinitionEntity
    let request: ServiceRequestEntity
    let account: AutoCareBonusAccountEntity

    beforeAll(async () => {
        const users = AppDataSource.getRepository(UserEntity)
        client = await users.save(users.create({
            name: 'Bonus Integration Client',
            email: `bonus-integration-${suffix}@example.com`,
            role: UserRole.Client,
            status: UserStatus.Active,
            passwordHash: 'hash',
            emailVerifiedAt: new Date(),
        }))
        const countries = AppDataSource.getRepository(AutomotiveMarketCountryEntity)
        country = await countries.save(countries.create({
            code: `BONUS-${suffix}`,
            names: { en: 'Bonus test country' },
            defaultLocale: 'en',
            supportedLocales: ['en'],
            timezone: 'UTC',
            currencyCode: 'USD',
            capabilities: {},
            legalLinks: {},
            active: true,
        }))
        const markets = AppDataSource.getRepository(AutomotiveMarketEntity)
        market = await markets.save(markets.create({
            countryId: country.id,
            countryCode: country.code,
            countryName: 'Bonus test country',
            cityCode: `bonus-${suffix}`,
            cityName: 'Bonus City',
            regionCode: null,
            regionName: null,
            centerLatitude: null,
            centerLongitude: null,
            currencyCode: 'USD',
            defaultLocale: 'en',
            supportedLocales: ['en'],
            timezone: 'UTC',
            capabilities: {},
            legalLinks: {},
            launchReady: false,
        }))
        const providers = AppDataSource.getRepository(AutomotiveProviderEntity)
        provider = await providers.save(providers.create({
            ownerId: null,
            name: `Bonus Garage ${suffix}`,
            description: null,
            status: AutomotiveProviderStatus.Active,
            verified: false,
            yearsActive: 0,
            staffCount: 1,
            rating: 0,
            reviewCount: 0,
            workstationCount: 1,
        }))
        const locations = AppDataSource.getRepository(AutomotiveServiceLocationEntity)
        location = await locations.save(locations.create({
            providerId: provider.id,
            marketId: market.id,
            zoneId: null,
            address: 'Bonus street, 1',
            hours: '08:00-21:00',
            appointmentCapacity: 1,
            timezone: 'UTC',
            weeklySchedule: {
                mon: { open: '08:00', close: '21:00', closed: false }, tue: { open: '08:00', close: '21:00', closed: false },
                wed: { open: '08:00', close: '21:00', closed: false }, thu: { open: '08:00', close: '21:00', closed: false },
                fri: { open: '08:00', close: '21:00', closed: false }, sat: { open: '08:00', close: '21:00', closed: false },
                sun: { open: '08:00', close: '21:00', closed: false },
            },
            blackoutDates: [], latitude: null, longitude: null, supportsMobile: false, supportsPickup: false,
            coverageRadiusKm: null, dispatchBasePriceMinor: 0, etaMinutes: null,
        }))
        const definitions = AppDataSource.getRepository(AutomotiveServiceDefinitionEntity)
        definition = await definitions.save(definitions.create({
            slug: `bonus-service-${suffix}`,
            categorySlug: 'maintenance',
            labels: { en: 'Bonus service' },
            priceType: AutomotivePriceType.From,
            comparisonAttributes: [],
            active: true,
        }))
        const requests = AppDataSource.getRepository(ServiceRequestEntity)
        request = await requests.save(requests.create({
            clientId: client.id,
            providerId: provider.id,
            locationId: location.id,
            definitionId: definition.id,
            offeringId: null,
            offeringSnapshot: null,
            vehicleSnapshot: null,
            contactSnapshot: null,
            preferredAt: null,
            note: null,
            idempotencyKey: `bonus-request-${suffix}`,
            estimateSnapshot: null,
            acceptedQuoteVersion: 1,
            acceptedQuoteSnapshot: { amountMinor: 290_000 },
            acceptedQuoteAt: new Date(),
            bookingSnapshot: { amountMinor: 290_000 },
            bookingCreatedAt: new Date(),
            status: ServiceRequestStatus.Accepted,
            clientConfirmedAt: new Date(),
            providerConfirmedAt: new Date(),
        }))
        const accounts = AppDataSource.getRepository(AutoCareBonusAccountEntity)
        account = await accounts.save(accounts.create({
            clientId: client.id,
            providerId: provider.id,
            balancePoints: 500,
            earnedPoints: 500,
            redeemedPoints: 0,
        }))
    })

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return
        await AppDataSource.getRepository(AutoCareBonusLedgerEntity).delete({ accountId: account?.id })
        await AppDataSource.getRepository(AutoCareBonusAccountEntity).delete({ id: account?.id })
        await AppDataSource.getRepository(ServiceRequestEntity).delete({ id: request?.id })
        await AppDataSource.getRepository(AutomotiveServiceLocationEntity).delete({ id: location?.id })
        await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).delete({ id: definition?.id })
        await AppDataSource.getRepository(AutomotiveProviderEntity).delete({ id: provider?.id })
        await AppDataSource.getRepository(AutomotiveMarketEntity).delete({ id: market?.id })
        await AppDataSource.getRepository(AutomotiveMarketCountryEntity).delete({ id: country?.id })
        await AppDataSource.getRepository(UserEntity).delete({ id: client?.id })
    })

    it('serializes concurrent redemption and records one immutable discount snapshot', async () => {
        const results = await Promise.all([
            redeemAutoCareBonus(client, { providerId: provider.id, requestId: request.id, points: 500 }, `redeem-a-${suffix}`),
            redeemAutoCareBonus(client, { providerId: provider.id, requestId: request.id, points: 500 }, `redeem-b-${suffix}`),
        ])

        expect(results).toHaveLength(2)
        const entries = await AppDataSource.getRepository(AutoCareBonusLedgerEntity).findBy({
            accountId: account.id,
            type: AutoCareBonusLedgerType.Redeem,
        })
        const updatedAccount = await AppDataSource.getRepository(AutoCareBonusAccountEntity).findOneByOrFail({ id: account.id })
        const updatedRequest = await AppDataSource.getRepository(ServiceRequestEntity).findOneByOrFail({ id: request.id })

        expect(entries).toHaveLength(1)
        expect(updatedAccount.balancePoints).toBe(0)
        expect(updatedAccount.redeemedPoints).toBe(500)
        expect(updatedRequest.bookingSnapshot).toMatchObject({
            amountMinor: 290_000,
            bonusDiscountMinor: 50_000,
            payableAmountMinor: 240_000,
        })
    })

    it('returns a cancelled redemption once and expires an earned balance only once', async () => {
        request.status = ServiceRequestStatus.Cancelled
        await AppDataSource.getRepository(ServiceRequestEntity).save(request)
        await Promise.all([
            AppDataSource.transaction((manager) => refundAutoCareBonusForCancelledRequest(manager, request, client.id)),
            AppDataSource.transaction((manager) => refundAutoCareBonusForCancelledRequest(manager, request, client.id)),
        ])

        const refunded = await AppDataSource.getRepository(AutoCareBonusLedgerEntity).findBy({
            accountId: account.id,
            type: AutoCareBonusLedgerType.Refund,
        })
        expect(refunded).toHaveLength(1)

        const accounts = AppDataSource.getRepository(AutoCareBonusAccountEntity)
        const ledger = AppDataSource.getRepository(AutoCareBonusLedgerEntity)
        const refundedAccount = await accounts.findOneByOrFail({ id: account.id })
        refundedAccount.balancePoints += 17
        refundedAccount.earnedPoints += 17
        const expiredAccount = await accounts.save(refundedAccount)
        await ledger.save(ledger.create({
            accountId: expiredAccount.id,
            clientId: client.id,
            providerId: expiredAccount.providerId,
            requestId: null,
            type: AutoCareBonusLedgerType.Earn,
            points: 17,
            reason: 'Expired fixture',
            idempotencyKey: `expired-fixture-${suffix}`,
            expiresAt: new Date(Date.now() - 60_000),
            actorId: null,
        }))

        await Promise.all([getMyAutoCareBonusAccounts(client), getMyAutoCareBonusAccounts(client)])
        const expirations = await ledger.findBy({ accountId: expiredAccount.id, type: AutoCareBonusLedgerType.Expire })
        const reconciled = await accounts.findOneByOrFail({ id: expiredAccount.id })

        expect(expirations).toHaveLength(1)
        expect(reconciled.balancePoints).toBe(500)
    })
})
