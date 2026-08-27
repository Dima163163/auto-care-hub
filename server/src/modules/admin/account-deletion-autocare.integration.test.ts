import { randomUUID } from 'node:crypto'
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
    AutomotiveProviderInvitationEntity,
    AutomotiveProviderInvitationRole,
    AutomotiveProviderMembershipEntity,
    AutomotiveProviderMembershipRole,
    AutomotiveProviderMembershipStatus,
    AutomotiveProviderStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    ServiceAttachmentEntity,
    ServiceAttachmentStatus,
    ServiceMessageEntity,
    ServiceRequestEntity,
    ServiceRequestStatus,
} from '../../entities/index.js'
import {
    AccountDeletionRequestEntity,
    AccountDeletionRequestStatus,
} from '../../entities/account-deletion-request/account-deletion-request.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import {
    createAutoCareAttachmentObjectKey,
    readAutoCareAttachmentObject,
    saveAutoCareAttachmentObject,
} from '../autocare/autocare-attachment-storage.js'
import { updateAdminDeletionRequestStatus } from './account-deletion-admin.service.js'
import { checkAutoCareDeletionInvariants } from '../users/account-deletion-invariants.js'

const weeklySchedule = {
    mon: { open: '08:00', close: '21:00', closed: false },
    tue: { open: '08:00', close: '21:00', closed: false },
    wed: { open: '08:00', close: '21:00', closed: false },
    thu: { open: '08:00', close: '21:00', closed: false },
    fri: { open: '08:00', close: '21:00', closed: false },
    sat: { open: '08:00', close: '21:00', closed: false },
    sun: { open: '08:00', close: '21:00', closed: false },
}

describe('AutoCare account deletion retention invariants', () => {
    const suffix = `${Date.now()}`
    let superAdmin: UserEntity
    let deletedOwner: UserEntity
    let country: AutomotiveMarketCountryEntity
    let market: AutomotiveMarketEntity
    let provider: AutomotiveProviderEntity
    let location: AutomotiveServiceLocationEntity
    let definition: AutomotiveServiceDefinitionEntity
    let serviceRequest: ServiceRequestEntity
    let attachment: ServiceAttachmentEntity
    let providerAttachment: ServiceAttachmentEntity
    let providerMessage: ServiceMessageEntity
    let deletionRequest: AccountDeletionRequestEntity
    let deletedOwnerEmail: string

    beforeAll(async () => {
        const users = AppDataSource.getRepository(UserEntity)
        ;[superAdmin, deletedOwner] = await users.save([
            users.create({ name: 'Deletion Super Admin', email: `deletion-super-${suffix}@example.com`, role: UserRole.SuperAdmin, status: UserStatus.Active, passwordHash: 'hash', emailVerifiedAt: new Date() }),
            users.create({ name: 'Deletion Provider Owner', email: `deletion-owner-${suffix}@example.com`, role: UserRole.Owner, status: UserStatus.Active, passwordHash: 'hash', emailVerifiedAt: new Date() }),
        ])
        deletedOwnerEmail = deletedOwner.email
        const countries = AppDataSource.getRepository(AutomotiveMarketCountryEntity)
        country = await countries.save(countries.create({
            code: `RETENTION-${suffix}`,
            names: { en: 'Retention test country' },
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
            countryName: 'Retention test country',
            cityCode: `retention-${suffix}`,
            cityName: 'Retention City',
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
            ownerId: deletedOwner.id,
            name: `Retention Garage ${suffix}`,
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
            address: 'Retention street, 1',
            hours: '08:00-21:00',
            appointmentCapacity: 1,
            timezone: 'UTC',
            weeklySchedule,
            blackoutDates: [],
            latitude: null,
            longitude: null,
            supportsMobile: false,
            supportsPickup: false,
            coverageRadiusKm: null,
            dispatchBasePriceMinor: 0,
            etaMinutes: null,
        }))
        const definitions = AppDataSource.getRepository(AutomotiveServiceDefinitionEntity)
        definition = await definitions.save(definitions.create({
            slug: `retention-service-${suffix}`,
            categorySlug: 'maintenance',
            labels: { en: 'Retention service' },
            priceType: AutomotivePriceType.From,
            comparisonAttributes: [],
            active: true,
        }))
        const requests = AppDataSource.getRepository(ServiceRequestEntity)
        serviceRequest = await requests.save(requests.create({
            clientId: deletedOwner.id,
            providerId: provider.id,
            locationId: location.id,
            definitionId: definition.id,
            offeringId: null,
            offeringSnapshot: null,
            vehicleSnapshot: { vin: 'private-fixture' },
            contactSnapshot: { email: deletedOwner.email },
            preferredAt: null,
            note: 'Private deletion fixture',
            idempotencyKey: `retention-request-${suffix}`,
            estimateSnapshot: null,
            acceptedQuoteVersion: null,
            acceptedQuoteSnapshot: null,
            acceptedQuoteAt: null,
            bookingSnapshot: null,
            bookingCreatedAt: null,
            status: ServiceRequestStatus.Open,
            clientConfirmedAt: null,
            providerConfirmedAt: null,
        }))
        const attachmentKey = createAutoCareAttachmentObjectKey('requests', serviceRequest.id, randomUUID())
        await saveAutoCareAttachmentObject(attachmentKey, Buffer.from('private attachment fixture'))
        const attachments = AppDataSource.getRepository(ServiceAttachmentEntity)
        attachment = await attachments.save(attachments.create({
            requestId: serviceRequest.id,
            threadId: null,
            uploadedById: deletedOwner.id,
            objectKey: attachmentKey,
            contentType: 'image/jpeg',
            bytes: 26,
            checksum: null,
            status: ServiceAttachmentStatus.Ready,
        }))
        const providerAttachmentKey = createAutoCareAttachmentObjectKey('requests', serviceRequest.id, randomUUID())
        await saveAutoCareAttachmentObject(providerAttachmentKey, Buffer.from('provider attachment fixture'))
        providerAttachment = await attachments.save(attachments.create({
            requestId: serviceRequest.id,
            threadId: null,
            uploadedById: superAdmin.id,
            objectKey: providerAttachmentKey,
            contentType: 'image/jpeg',
            bytes: 27,
            checksum: null,
            status: ServiceAttachmentStatus.Ready,
        }))
        providerMessage = await AppDataSource.getRepository(ServiceMessageEntity).save({
            requestId: serviceRequest.id,
            threadId: null,
            senderId: superAdmin.id,
            body: 'Provider response contains private client context',
        })
        await AppDataSource.getRepository(AutomotiveProviderMembershipEntity).save({
            providerId: provider.id,
            userId: deletedOwner.id,
            locationId: null,
            role: AutomotiveProviderMembershipRole.Owner,
            status: AutomotiveProviderMembershipStatus.Active,
        })
        await AppDataSource.getRepository(AutomotiveProviderInvitationEntity).save({
            providerId: provider.id,
            email: deletedOwner.email,
            locationId: null,
            role: AutomotiveProviderInvitationRole.Manager,
            status: 'pending',
            tokenHash: 'a'.repeat(64),
            invitedById: deletedOwner.id,
            expiresAt: new Date(Date.now() + 86_400_000),
            acceptedAt: null,
            revokedAt: null,
        })
        // An invitation can be addressed to the account without having been
        // created by that account. Deletion must remove this pending PII too.
        await AppDataSource.getRepository(AutomotiveProviderInvitationEntity).save({
            providerId: provider.id,
            email: deletedOwner.email,
            locationId: location.id,
            role: AutomotiveProviderInvitationRole.Staff,
            status: 'pending',
            tokenHash: 'b'.repeat(64),
            invitedById: superAdmin.id,
            expiresAt: new Date(Date.now() + 86_400_000),
            acceptedAt: null,
            revokedAt: null,
        })
        const accounts = AppDataSource.getRepository(AutoCareBonusAccountEntity)
        const account = await accounts.save(accounts.create({
            clientId: deletedOwner.id,
            providerId: provider.id,
            balancePoints: 10,
            earnedPoints: 10,
            redeemedPoints: 0,
        }))
        await AppDataSource.getRepository(AutoCareBonusLedgerEntity).save({
            accountId: account.id,
            clientId: deletedOwner.id,
            providerId: provider.id,
            requestId: serviceRequest.id,
            type: AutoCareBonusLedgerType.Earn,
            points: 10,
            reason: 'Private retention fixture',
            idempotencyKey: `retention-ledger-${suffix}`,
            expiresAt: null,
            actorId: null,
        })
        const deletionRequests = AppDataSource.getRepository(AccountDeletionRequestEntity)
        deletionRequest = await deletionRequests.save(deletionRequests.create({
            userId: deletedOwner.id,
            status: AccountDeletionRequestStatus.Pending,
            reason: 'Integration retention check',
            cancelledAt: null,
            completedAt: null,
            requestedAt: new Date(Date.now() - 31 * 86_400_000),
        }))
    })

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return
        await AppDataSource.getRepository(AccountDeletionRequestEntity).delete({ id: deletionRequest?.id })
        await AppDataSource.getRepository(ServiceRequestEntity).delete({ id: serviceRequest?.id })
        await AppDataSource.getRepository(AutomotiveProviderEntity).delete({ id: provider?.id })
        await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).delete({ id: definition?.id })
        await AppDataSource.getRepository(AutomotiveServiceLocationEntity).delete({ id: location?.id })
        await AppDataSource.getRepository(AutomotiveMarketEntity).delete({ id: market?.id })
        await AppDataSource.getRepository(AutomotiveMarketCountryEntity).delete({ id: country?.id })
        await AppDataSource.getRepository(UserEntity).delete([deletedOwner?.id, superAdmin?.id].filter(Boolean))
    })

    it('removes private media, bonus data and memberships while suspending an owned provider', async () => {
        const completed = await updateAdminDeletionRequestStatus(
            superAdmin,
            deletionRequest.id,
            AccountDeletionRequestStatus.Completed,
        )

        expect(completed.status).toBe(AccountDeletionRequestStatus.Completed)
        expect(await AppDataSource.getRepository(ServiceAttachmentEntity).countBy({ id: attachment.id })).toBe(0)
        expect(await AppDataSource.getRepository(ServiceAttachmentEntity).countBy({ id: providerAttachment.id })).toBe(0)
        await expect(readAutoCareAttachmentObject(attachment.objectKey)).rejects.toMatchObject({ statusCode: 404 })
        await expect(readAutoCareAttachmentObject(providerAttachment.objectKey)).rejects.toMatchObject({ statusCode: 404 })
        const redactedProviderMessage = await AppDataSource.getRepository(ServiceMessageEntity).findOneByOrFail({ id: providerMessage.id })
        expect(redactedProviderMessage.body).toBeNull()
        expect(await AppDataSource.getRepository(AutoCareBonusAccountEntity).countBy({ clientId: deletedOwner.id })).toBe(0)
        expect(await AppDataSource.getRepository(AutoCareBonusLedgerEntity).countBy({ clientId: deletedOwner.id })).toBe(0)
        expect(await AppDataSource.getRepository(AutomotiveProviderMembershipEntity).countBy({ userId: deletedOwner.id })).toBe(0)
        expect(await AppDataSource.getRepository(AutomotiveProviderInvitationEntity).countBy({ invitedById: deletedOwner.id })).toBe(0)
        expect(await AppDataSource.getRepository(AutomotiveProviderInvitationEntity).countBy({ email: deletedOwnerEmail })).toBe(0)

        const updatedProvider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneByOrFail({ id: provider.id })
        const anonymized = await AppDataSource.getRepository(UserEntity).findOneByOrFail({ id: deletedOwner.id })
        expect(updatedProvider).toMatchObject({ ownerId: null, status: AutomotiveProviderStatus.Suspended })
        expect(anonymized).toMatchObject({ status: UserStatus.Blocked })
        expect(anonymized.email).not.toBe(`deletion-owner-${suffix}@example.com`)
        const invariantResults = await checkAutoCareDeletionInvariants(AppDataSource, deletedOwner.id)
        expect(invariantResults.every(({ count }) => count === 0)).toBe(true)
    })
})
