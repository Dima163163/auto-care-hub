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
import { ClientVehicleEntity } from '../../entities/user/client-vehicle.entity.js'
import { listClientVehicles } from '../users/client-vehicles.service.js'
import { resetClientVehicleBindingBackfill, runClientVehicleBindingBackfill, verifyClientVehicleBindings } from '../../shared/security/data-encryption/client-vehicle-binding-backfill.js'
import { resetBookingSnapshotBindingBackfill, runBookingSnapshotBindingBackfill, verifyBookingSnapshotBindings } from '../../shared/security/data-encryption/booking-snapshot-binding-backfill.js'
import { resetAcceptedQuoteBindingBackfill, runAcceptedQuoteBindingBackfill, verifyAcceptedQuoteBindings } from '../../shared/security/data-encryption/accepted-quote-binding-backfill.js'
import { resetEstimateSnapshotBindingBackfill, runEstimateSnapshotBindingBackfill, verifyEstimateSnapshotBindings } from '../../shared/security/data-encryption/estimate-snapshot-binding-backfill.js'
import { resetContactSnapshotBindingBackfill, runContactSnapshotBindingBackfill, verifyContactSnapshotBindings } from '../../shared/security/data-encryption/contact-snapshot-binding-backfill.js'
import { resetVehicleSnapshotBindingBackfill, runVehicleSnapshotBindingBackfill, verifyVehicleSnapshotBindings } from '../../shared/security/data-encryption/vehicle-snapshot-binding-backfill.js'
import { resetServiceRequestNoteBindingBackfill, runServiceRequestNoteBindingBackfill, verifyServiceRequestNoteBindings } from '../../shared/security/data-encryption/service-request-note-binding-backfill.js'
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
            vehicleId: null,
            vehicleSnapshot: { brand: 'Toyota', model: 'Camry' },
            contactSnapshot: { email: client.email, phone: '+79990000000' },
            preferredAt: null,
            note: 'Private client symptom',
            idempotencyKey: `bonus-request-${suffix}`,
            estimateSnapshot: { amountMinor: 290_000, currencyCode: 'RUB' },
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

    it('binds client vehicle fields to vehicle and owner and backfills legacy rows', async () => {
        const vehicles = AppDataSource.getRepository(ClientVehicleEntity)
        const createVehicle = (vin: string) => vehicles.create({
            userId: client.id, brandId: 'toyota', model: 'Camry', year: 2021,
            fuelType: 'petrol', engineDisplacement: null, horsepower: null,
            color: 'Black', vin, licensePlate: 'A123AA', internalNumber: null,
            imageUrl: '/images/autocare/vehicles/vehicle-sedan.webp', isPrimary: false,
        })
        const source = await vehicles.save(createVehicle('JT123456789012345'))
        const target = await vehicles.save(createVehicle('JT987654321098765'))
        const previousStrict = process.env.DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING
        try {
            const [storedSource] = await AppDataSource.query(
                'SELECT "vin", "vinBinding" FROM "client_vehicles" WHERE "id" = $1', [source.id],
            ) as Array<{ vin: string; vinBinding: string }>
            const [storedTarget] = await AppDataSource.query(
                'SELECT "vin", "vinBinding" FROM "client_vehicles" WHERE "id" = $1', [target.id],
            ) as Array<{ vin: string; vinBinding: string }>
            if (!storedSource || !storedTarget) throw new Error('Synthetic encrypted vehicles are missing.')
            expect(storedSource.vin).not.toContain('JT123456789012345')
            expect(storedSource.vinBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
            const response = await listClientVehicles(client)
            expect(response.find((vehicle) => vehicle.id === source.id)).not.toHaveProperty('vinBinding')
            await AppDataSource.query(
                'UPDATE "client_vehicles" SET "vin" = $1, "vinBinding" = $2 WHERE "id" = $3',
                [storedSource.vin, storedSource.vinBinding, target.id],
            )
            try {
                await expect(vehicles.findOneByOrFail({ id: target.id }))
                    .rejects.toThrow('Encrypted record binding authentication failed.')
            } finally {
                await AppDataSource.query(
                    'UPDATE "client_vehicles" SET "vin" = $1, "vinBinding" = $2 WHERE "id" = $3',
                    [storedTarget.vin, storedTarget.vinBinding, target.id],
                )
            }
            await AppDataSource.query('UPDATE "client_vehicles" SET "vinBinding" = NULL WHERE "id" = $1', [source.id])
            await resetClientVehicleBindingBackfill(AppDataSource)
            await expect(verifyClientVehicleBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 }))
                .rejects.toThrow('Encrypted record binding is missing.')
            process.env.DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING = 'true'
            await expect(vehicles.findOneByOrFail({ id: source.id }))
                .rejects.toThrow('Encrypted record binding is missing.')
            delete process.env.DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING
            expect((await runClientVehicleBindingBackfill(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            expect((await verifyClientVehicleBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            process.env.DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING = 'true'
            expect((await vehicles.findOneByOrFail({ id: source.id })).vin).toBe('JT123456789012345')
        } finally {
            if (previousStrict === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING = previousStrict
            await resetClientVehicleBindingBackfill(AppDataSource)
            await vehicles.delete({ id: source.id })
            await vehicles.delete({ id: target.id })
        }
    })

    it('binds booking snapshots to request ownership and backfills legacy rows', async () => {
        const requests = AppDataSource.getRepository(ServiceRequestEntity)
        const target = await requests.save(requests.create({
            clientId: client.id, providerId: provider.id, locationId: location.id, definitionId: definition.id,
            offeringId: null, offeringSnapshot: null, vehicleSnapshot: null, contactSnapshot: null,
            preferredAt: null, note: null, idempotencyKey: `bonus-binding-target-${suffix}`,
            estimateSnapshot: null, acceptedQuoteVersion: null, acceptedQuoteSnapshot: null,
            acceptedQuoteAt: null, bookingSnapshot: { amountMinor: 99_000 }, bookingCreatedAt: new Date(),
            status: ServiceRequestStatus.Accepted, clientConfirmedAt: new Date(), providerConfirmedAt: new Date(),
        }))
        const previousStrict = process.env.DATA_ENCRYPTION_REQUIRE_BOOKING_SNAPSHOT_RECORD_BINDING
        try {
            const [storedSource] = await AppDataSource.query(
                'SELECT "bookingSnapshot", "bookingSnapshotBinding" FROM "autocare_service_requests" WHERE "id" = $1', [request.id],
            ) as Array<{ bookingSnapshot: object; bookingSnapshotBinding: string }>
            const [storedTarget] = await AppDataSource.query(
                'SELECT "bookingSnapshot", "bookingSnapshotBinding" FROM "autocare_service_requests" WHERE "id" = $1', [target.id],
            ) as Array<{ bookingSnapshot: object; bookingSnapshotBinding: string }>
            if (!storedSource || !storedTarget) throw new Error('Synthetic encrypted booking snapshots are missing.')
            expect(storedSource.bookingSnapshot).not.toHaveProperty('amountMinor')
            expect(storedSource.bookingSnapshotBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
            await AppDataSource.query(
                'UPDATE "autocare_service_requests" SET "bookingSnapshot" = $1::jsonb, "bookingSnapshotBinding" = $2 WHERE "id" = $3',
                [storedSource.bookingSnapshot, storedSource.bookingSnapshotBinding, target.id],
            )
            try {
                await expect(requests.findOneByOrFail({ id: target.id }))
                    .rejects.toThrow('Encrypted record binding authentication failed.')
            } finally {
                await AppDataSource.query(
                    'UPDATE "autocare_service_requests" SET "bookingSnapshot" = $1::jsonb, "bookingSnapshotBinding" = $2 WHERE "id" = $3',
                    [storedTarget.bookingSnapshot, storedTarget.bookingSnapshotBinding, target.id],
                )
            }
            await AppDataSource.query('UPDATE "autocare_service_requests" SET "bookingSnapshotBinding" = NULL WHERE "id" = $1', [request.id])
            await resetBookingSnapshotBindingBackfill(AppDataSource)
            await expect(verifyBookingSnapshotBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 }))
                .rejects.toThrow('Encrypted record binding is missing.')
            process.env.DATA_ENCRYPTION_REQUIRE_BOOKING_SNAPSHOT_RECORD_BINDING = 'true'
            await expect(requests.findOneByOrFail({ id: request.id }))
                .rejects.toThrow('Encrypted record binding is missing.')
            delete process.env.DATA_ENCRYPTION_REQUIRE_BOOKING_SNAPSHOT_RECORD_BINDING
            expect((await runBookingSnapshotBindingBackfill(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            expect((await verifyBookingSnapshotBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            process.env.DATA_ENCRYPTION_REQUIRE_BOOKING_SNAPSHOT_RECORD_BINDING = 'true'
            expect((await requests.findOneByOrFail({ id: request.id })).bookingSnapshot?.amountMinor).toBe(290_000)
        } finally {
            if (previousStrict === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_BOOKING_SNAPSHOT_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_BOOKING_SNAPSHOT_RECORD_BINDING = previousStrict
            await resetBookingSnapshotBindingBackfill(AppDataSource)
            await requests.delete({ id: target.id })
        }
    })

    it('binds accepted quotes to request ownership and backfills legacy rows', async () => {
        const requests = AppDataSource.getRepository(ServiceRequestEntity)
        const target = await requests.save(requests.create({
            clientId: client.id, providerId: provider.id, locationId: location.id, definitionId: definition.id,
            offeringId: null, offeringSnapshot: null, vehicleSnapshot: null, contactSnapshot: null,
            preferredAt: null, note: null, idempotencyKey: `bonus-accepted-binding-target-${suffix}`,
            estimateSnapshot: null, acceptedQuoteVersion: 1, acceptedQuoteSnapshot: { amountMinor: 99_000 },
            acceptedQuoteAt: new Date(), bookingSnapshot: null, bookingCreatedAt: null,
            status: ServiceRequestStatus.Accepted, clientConfirmedAt: new Date(), providerConfirmedAt: new Date(),
        }))
        const previousStrict = process.env.DATA_ENCRYPTION_REQUIRE_ACCEPTED_QUOTE_RECORD_BINDING
        try {
            const [storedSource] = await AppDataSource.query(
                'SELECT "acceptedQuoteSnapshot", "acceptedQuoteSnapshotBinding" FROM "autocare_service_requests" WHERE "id" = $1', [request.id],
            ) as Array<{ acceptedQuoteSnapshot: object; acceptedQuoteSnapshotBinding: string }>
            const [storedTarget] = await AppDataSource.query(
                'SELECT "acceptedQuoteSnapshot", "acceptedQuoteSnapshotBinding" FROM "autocare_service_requests" WHERE "id" = $1', [target.id],
            ) as Array<{ acceptedQuoteSnapshot: object; acceptedQuoteSnapshotBinding: string }>
            if (!storedSource || !storedTarget) throw new Error('Synthetic encrypted accepted quotes are missing.')
            expect(storedSource.acceptedQuoteSnapshot).not.toHaveProperty('amountMinor')
            expect(storedSource.acceptedQuoteSnapshotBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
            await AppDataSource.query(
                'UPDATE "autocare_service_requests" SET "acceptedQuoteSnapshot" = $1::jsonb, "acceptedQuoteSnapshotBinding" = $2 WHERE "id" = $3',
                [storedSource.acceptedQuoteSnapshot, storedSource.acceptedQuoteSnapshotBinding, target.id],
            )
            try {
                await expect(requests.findOneByOrFail({ id: target.id }))
                    .rejects.toThrow('Encrypted record binding authentication failed.')
            } finally {
                await AppDataSource.query(
                    'UPDATE "autocare_service_requests" SET "acceptedQuoteSnapshot" = $1::jsonb, "acceptedQuoteSnapshotBinding" = $2 WHERE "id" = $3',
                    [storedTarget.acceptedQuoteSnapshot, storedTarget.acceptedQuoteSnapshotBinding, target.id],
                )
            }
            await AppDataSource.query('UPDATE "autocare_service_requests" SET "acceptedQuoteSnapshotBinding" = NULL WHERE "id" = $1', [request.id])
            await resetAcceptedQuoteBindingBackfill(AppDataSource)
            await expect(verifyAcceptedQuoteBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 }))
                .rejects.toThrow('Encrypted record binding is missing.')
            process.env.DATA_ENCRYPTION_REQUIRE_ACCEPTED_QUOTE_RECORD_BINDING = 'true'
            await expect(requests.findOneByOrFail({ id: request.id }))
                .rejects.toThrow('Encrypted record binding is missing.')
            delete process.env.DATA_ENCRYPTION_REQUIRE_ACCEPTED_QUOTE_RECORD_BINDING
            expect((await runAcceptedQuoteBindingBackfill(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            expect((await verifyAcceptedQuoteBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            process.env.DATA_ENCRYPTION_REQUIRE_ACCEPTED_QUOTE_RECORD_BINDING = 'true'
            expect((await requests.findOneByOrFail({ id: request.id })).acceptedQuoteSnapshot?.amountMinor).toBe(290_000)
        } finally {
            if (previousStrict === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_ACCEPTED_QUOTE_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_ACCEPTED_QUOTE_RECORD_BINDING = previousStrict
            await resetAcceptedQuoteBindingBackfill(AppDataSource)
            await requests.delete({ id: target.id })
        }
    })

    it('binds estimate snapshots to request ownership and backfills legacy rows', async () => {
        const requests = AppDataSource.getRepository(ServiceRequestEntity)
        const target = await requests.save(requests.create({
            clientId: client.id, providerId: provider.id, locationId: location.id, definitionId: definition.id,
            offeringId: null, offeringSnapshot: null, vehicleSnapshot: null, contactSnapshot: null,
            preferredAt: null, note: null, idempotencyKey: `bonus-estimate-binding-target-${suffix}`,
            estimateSnapshot: { amountMinor: 99_000 }, acceptedQuoteVersion: null, acceptedQuoteSnapshot: null,
            acceptedQuoteAt: null, bookingSnapshot: null, bookingCreatedAt: null,
            status: ServiceRequestStatus.Accepted, clientConfirmedAt: new Date(), providerConfirmedAt: new Date(),
        }))
        const previousStrict = process.env.DATA_ENCRYPTION_REQUIRE_ESTIMATE_SNAPSHOT_RECORD_BINDING
        try {
            const [storedSource] = await AppDataSource.query(
                'SELECT "estimateSnapshot", "estimateSnapshotBinding" FROM "autocare_service_requests" WHERE "id" = $1', [request.id],
            ) as Array<{ estimateSnapshot: object; estimateSnapshotBinding: string }>
            const [storedTarget] = await AppDataSource.query(
                'SELECT "estimateSnapshot", "estimateSnapshotBinding" FROM "autocare_service_requests" WHERE "id" = $1', [target.id],
            ) as Array<{ estimateSnapshot: object; estimateSnapshotBinding: string }>
            if (!storedSource || !storedTarget) throw new Error('Synthetic encrypted estimate snapshots are missing.')
            expect(storedSource.estimateSnapshot).not.toHaveProperty('amountMinor')
            expect(storedSource.estimateSnapshotBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
            await AppDataSource.query(
                'UPDATE "autocare_service_requests" SET "estimateSnapshot" = $1::jsonb, "estimateSnapshotBinding" = $2 WHERE "id" = $3',
                [storedSource.estimateSnapshot, storedSource.estimateSnapshotBinding, target.id],
            )
            try {
                await expect(requests.findOneByOrFail({ id: target.id }))
                    .rejects.toThrow('Encrypted record binding authentication failed.')
            } finally {
                await AppDataSource.query(
                    'UPDATE "autocare_service_requests" SET "estimateSnapshot" = $1::jsonb, "estimateSnapshotBinding" = $2 WHERE "id" = $3',
                    [storedTarget.estimateSnapshot, storedTarget.estimateSnapshotBinding, target.id],
                )
            }
            await AppDataSource.query('UPDATE "autocare_service_requests" SET "estimateSnapshotBinding" = NULL WHERE "id" = $1', [request.id])
            await resetEstimateSnapshotBindingBackfill(AppDataSource)
            await expect(verifyEstimateSnapshotBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 }))
                .rejects.toThrow('Encrypted record binding is missing.')
            process.env.DATA_ENCRYPTION_REQUIRE_ESTIMATE_SNAPSHOT_RECORD_BINDING = 'true'
            await expect(requests.findOneByOrFail({ id: request.id }))
                .rejects.toThrow('Encrypted record binding is missing.')
            delete process.env.DATA_ENCRYPTION_REQUIRE_ESTIMATE_SNAPSHOT_RECORD_BINDING
            expect((await runEstimateSnapshotBindingBackfill(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            expect((await verifyEstimateSnapshotBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            process.env.DATA_ENCRYPTION_REQUIRE_ESTIMATE_SNAPSHOT_RECORD_BINDING = 'true'
            expect((await requests.findOneByOrFail({ id: request.id })).estimateSnapshot?.amountMinor).toBe(290_000)
        } finally {
            if (previousStrict === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_ESTIMATE_SNAPSHOT_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_ESTIMATE_SNAPSHOT_RECORD_BINDING = previousStrict
            await resetEstimateSnapshotBindingBackfill(AppDataSource)
            await requests.delete({ id: target.id })
        }
    })

    it('binds contact snapshots to request ownership and backfills legacy rows', async () => {
        const requests = AppDataSource.getRepository(ServiceRequestEntity)
        const target = await requests.save(requests.create({
            clientId: client.id, providerId: provider.id, locationId: location.id, definitionId: definition.id,
            offeringId: null, offeringSnapshot: null, vehicleSnapshot: null,
            preferredAt: null, note: null, idempotencyKey: `bonus-contact-binding-target-${suffix}`,
            contactSnapshot: { email: 'target@example.test' }, estimateSnapshot: null,
            acceptedQuoteVersion: null, acceptedQuoteSnapshot: null,
            acceptedQuoteAt: null, bookingSnapshot: null, bookingCreatedAt: null,
            status: ServiceRequestStatus.Accepted, clientConfirmedAt: new Date(), providerConfirmedAt: new Date(),
        }))
        const previousStrict = process.env.DATA_ENCRYPTION_REQUIRE_CONTACT_SNAPSHOT_RECORD_BINDING
        try {
            const [storedSource] = await AppDataSource.query(
                'SELECT "contactSnapshot", "contactSnapshotBinding" FROM "autocare_service_requests" WHERE "id" = $1', [request.id],
            ) as Array<{ contactSnapshot: object; contactSnapshotBinding: string }>
            const [storedTarget] = await AppDataSource.query(
                'SELECT "contactSnapshot", "contactSnapshotBinding" FROM "autocare_service_requests" WHERE "id" = $1', [target.id],
            ) as Array<{ contactSnapshot: object; contactSnapshotBinding: string }>
            if (!storedSource || !storedTarget) throw new Error('Synthetic encrypted contact snapshots are missing.')
            expect(storedSource.contactSnapshot).not.toHaveProperty('email')
            expect(storedSource.contactSnapshotBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
            await AppDataSource.query(
                'UPDATE "autocare_service_requests" SET "contactSnapshot" = $1::jsonb, "contactSnapshotBinding" = $2 WHERE "id" = $3',
                [storedSource.contactSnapshot, storedSource.contactSnapshotBinding, target.id],
            )
            try {
                await expect(requests.findOneByOrFail({ id: target.id }))
                    .rejects.toThrow('Encrypted record binding authentication failed.')
            } finally {
                await AppDataSource.query(
                    'UPDATE "autocare_service_requests" SET "contactSnapshot" = $1::jsonb, "contactSnapshotBinding" = $2 WHERE "id" = $3',
                    [storedTarget.contactSnapshot, storedTarget.contactSnapshotBinding, target.id],
                )
            }
            await AppDataSource.query('UPDATE "autocare_service_requests" SET "contactSnapshotBinding" = NULL WHERE "id" = $1', [request.id])
            await resetContactSnapshotBindingBackfill(AppDataSource)
            await expect(verifyContactSnapshotBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 }))
                .rejects.toThrow('Encrypted record binding is missing.')
            process.env.DATA_ENCRYPTION_REQUIRE_CONTACT_SNAPSHOT_RECORD_BINDING = 'true'
            await expect(requests.findOneByOrFail({ id: request.id }))
                .rejects.toThrow('Encrypted record binding is missing.')
            delete process.env.DATA_ENCRYPTION_REQUIRE_CONTACT_SNAPSHOT_RECORD_BINDING
            expect((await runContactSnapshotBindingBackfill(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            expect((await verifyContactSnapshotBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            process.env.DATA_ENCRYPTION_REQUIRE_CONTACT_SNAPSHOT_RECORD_BINDING = 'true'
            expect((await requests.findOneByOrFail({ id: request.id })).contactSnapshot?.email).toBe(client.email)
        } finally {
            if (previousStrict === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_CONTACT_SNAPSHOT_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_CONTACT_SNAPSHOT_RECORD_BINDING = previousStrict
            await resetContactSnapshotBindingBackfill(AppDataSource)
            await requests.delete({ id: target.id })
        }
    })

    it('binds service request notes to request ownership and backfills legacy rows', async () => {
        const requests = AppDataSource.getRepository(ServiceRequestEntity)
        const target = await requests.save(requests.create({
            clientId: client.id, providerId: provider.id, locationId: location.id, definitionId: definition.id,
            offeringId: null, offeringSnapshot: null, vehicleSnapshot: null,
            preferredAt: null, idempotencyKey: `bonus-note-binding-target-${suffix}`,
            note: 'Target symptom', estimateSnapshot: null,
            acceptedQuoteVersion: null, acceptedQuoteSnapshot: null,
            acceptedQuoteAt: null, bookingSnapshot: null, bookingCreatedAt: null,
            status: ServiceRequestStatus.Accepted, clientConfirmedAt: new Date(), providerConfirmedAt: new Date(),
        }))
        const previousStrict = process.env.DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_NOTE_RECORD_BINDING
        try {
            const [storedSource] = await AppDataSource.query(
                'SELECT "note", "noteBinding" FROM "autocare_service_requests" WHERE "id" = $1', [request.id],
            ) as Array<{ note: string; noteBinding: string }>
            const [storedTarget] = await AppDataSource.query(
                'SELECT "note", "noteBinding" FROM "autocare_service_requests" WHERE "id" = $1', [target.id],
            ) as Array<{ note: string; noteBinding: string }>
            if (!storedSource || !storedTarget) throw new Error('Synthetic encrypted service request notes are missing.')
            expect(storedSource.note).not.toContain('Private client symptom')
            expect(storedSource.noteBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
            await AppDataSource.query(
                'UPDATE "autocare_service_requests" SET "note" = $1::text, "noteBinding" = $2 WHERE "id" = $3',
                [storedSource.note, storedSource.noteBinding, target.id],
            )
            try {
                await expect(requests.findOneByOrFail({ id: target.id }))
                    .rejects.toThrow('Encrypted record binding authentication failed.')
            } finally {
                await AppDataSource.query(
                    'UPDATE "autocare_service_requests" SET "note" = $1::text, "noteBinding" = $2 WHERE "id" = $3',
                    [storedTarget.note, storedTarget.noteBinding, target.id],
                )
            }
            await AppDataSource.query('UPDATE "autocare_service_requests" SET "noteBinding" = NULL WHERE "id" = $1', [request.id])
            await resetServiceRequestNoteBindingBackfill(AppDataSource)
            await expect(verifyServiceRequestNoteBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 }))
                .rejects.toThrow('Encrypted record binding is missing.')
            process.env.DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_NOTE_RECORD_BINDING = 'true'
            await expect(requests.findOneByOrFail({ id: request.id }))
                .rejects.toThrow('Encrypted record binding is missing.')
            delete process.env.DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_NOTE_RECORD_BINDING
            expect((await runServiceRequestNoteBindingBackfill(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            expect((await verifyServiceRequestNoteBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            process.env.DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_NOTE_RECORD_BINDING = 'true'
            expect((await requests.findOneByOrFail({ id: request.id })).note).toBe('Private client symptom')
        } finally {
            if (previousStrict === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_NOTE_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_NOTE_RECORD_BINDING = previousStrict
            await resetServiceRequestNoteBindingBackfill(AppDataSource)
            await requests.delete({ id: target.id })
        }
    })

    it('binds vehicle snapshots to request ownership and backfills legacy rows', async () => {
        const requests = AppDataSource.getRepository(ServiceRequestEntity)
        const target = await requests.save(requests.create({
            clientId: client.id, providerId: provider.id, locationId: location.id, definitionId: definition.id,
            offeringId: null, offeringSnapshot: null, vehicleId: null,
            preferredAt: null, note: null, idempotencyKey: `bonus-vehicle-binding-target-${suffix}`,
            vehicleSnapshot: { brand: 'Honda', model: 'Civic' }, contactSnapshot: null, estimateSnapshot: null,
            acceptedQuoteVersion: null, acceptedQuoteSnapshot: null,
            acceptedQuoteAt: null, bookingSnapshot: null, bookingCreatedAt: null,
            status: ServiceRequestStatus.Accepted, clientConfirmedAt: new Date(), providerConfirmedAt: new Date(),
        }))
        const previousStrict = process.env.DATA_ENCRYPTION_REQUIRE_VEHICLE_SNAPSHOT_RECORD_BINDING
        try {
            const [storedSource] = await AppDataSource.query(
                'SELECT "vehicleSnapshot", "vehicleSnapshotBinding" FROM "autocare_service_requests" WHERE "id" = $1', [request.id],
            ) as Array<{ vehicleSnapshot: object; vehicleSnapshotBinding: string }>
            const [storedTarget] = await AppDataSource.query(
                'SELECT "vehicleSnapshot", "vehicleSnapshotBinding" FROM "autocare_service_requests" WHERE "id" = $1', [target.id],
            ) as Array<{ vehicleSnapshot: object; vehicleSnapshotBinding: string }>
            if (!storedSource || !storedTarget) throw new Error('Synthetic encrypted vehicle snapshots are missing.')
            expect(storedSource.vehicleSnapshot).not.toHaveProperty('brand')
            expect(storedSource.vehicleSnapshotBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
            await AppDataSource.query(
                'UPDATE "autocare_service_requests" SET "vehicleSnapshot" = $1::jsonb, "vehicleSnapshotBinding" = $2 WHERE "id" = $3',
                [storedSource.vehicleSnapshot, storedSource.vehicleSnapshotBinding, target.id],
            )
            try {
                await expect(requests.findOneByOrFail({ id: target.id }))
                    .rejects.toThrow('Encrypted record binding authentication failed.')
            } finally {
                await AppDataSource.query(
                    'UPDATE "autocare_service_requests" SET "vehicleSnapshot" = $1::jsonb, "vehicleSnapshotBinding" = $2 WHERE "id" = $3',
                    [storedTarget.vehicleSnapshot, storedTarget.vehicleSnapshotBinding, target.id],
                )
            }
            await AppDataSource.query('UPDATE "autocare_service_requests" SET "vehicleSnapshotBinding" = NULL WHERE "id" = $1', [request.id])
            await resetVehicleSnapshotBindingBackfill(AppDataSource)
            await expect(verifyVehicleSnapshotBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 }))
                .rejects.toThrow('Encrypted record binding is missing.')
            process.env.DATA_ENCRYPTION_REQUIRE_VEHICLE_SNAPSHOT_RECORD_BINDING = 'true'
            await expect(requests.findOneByOrFail({ id: request.id }))
                .rejects.toThrow('Encrypted record binding is missing.')
            delete process.env.DATA_ENCRYPTION_REQUIRE_VEHICLE_SNAPSHOT_RECORD_BINDING
            expect((await runVehicleSnapshotBindingBackfill(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            expect((await verifyVehicleSnapshotBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            process.env.DATA_ENCRYPTION_REQUIRE_VEHICLE_SNAPSHOT_RECORD_BINDING = 'true'
            expect((await requests.findOneByOrFail({ id: request.id })).vehicleSnapshot?.brand).toBe('Toyota')
        } finally {
            if (previousStrict === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_VEHICLE_SNAPSHOT_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_VEHICLE_SNAPSHOT_RECORD_BINDING = previousStrict
            await resetVehicleSnapshotBindingBackfill(AppDataSource)
            await requests.delete({ id: target.id })
        }
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

    it('does not take a fresh award when an older award was already redeemed before expiry', async () => {
        const users = AppDataSource.getRepository(UserEntity)
        const accounts = AppDataSource.getRepository(AutoCareBonusAccountEntity)
        const ledger = AppDataSource.getRepository(AutoCareBonusLedgerEntity)
        const secondClient = await users.save(users.create({
            name: 'Bonus Expiry Client', email: `bonus-expiry-${suffix}@example.com`,
            role: UserRole.Client, status: UserStatus.Active, passwordHash: 'hash', emailVerifiedAt: new Date(),
        }))
        let secondAccount: AutoCareBonusAccountEntity | null = null
        try {
            secondAccount = await accounts.save(accounts.create({
                clientId: secondClient.id, providerId: provider.id,
                balancePoints: 100, earnedPoints: 200, redeemedPoints: 100,
            }))
            const oldDate = new Date('2026-01-01T00:00:00.000Z')
            const spentDate = new Date('2026-01-02T00:00:00.000Z')
            const freshDate = new Date('2026-01-06T00:00:00.000Z')
            for (const [id, type, points, createdAt, expiresAt] of [
                ['old', AutoCareBonusLedgerType.Earn, 100, oldDate, new Date('2026-01-05T00:00:00.000Z')],
                ['spent', AutoCareBonusLedgerType.Redeem, -100, spentDate, null],
                ['fresh', AutoCareBonusLedgerType.Earn, 100, freshDate, new Date('2027-01-05T00:00:00.000Z')],
            ] as const) {
                await ledger.save(ledger.create({
                    accountId: secondAccount.id, clientId: secondClient.id, providerId: provider.id,
                    requestId: null, type, points, reason: id, idempotencyKey: `${id}-${suffix}`,
                    expiresAt, actorId: null, createdAt,
                }))
            }

            const [result] = await getMyAutoCareBonusAccounts(secondClient)
            expect(result?.balancePoints).toBe(100)
            expect(await ledger.countBy({ accountId: secondAccount.id, type: AutoCareBonusLedgerType.Expire })).toBe(0)
        } finally {
            if (secondAccount) {
                await ledger.delete({ accountId: secondAccount.id })
                await accounts.delete({ id: secondAccount.id })
            }
            await users.delete({ id: secondClient.id })
        }
    })
})
