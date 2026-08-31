import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import sharp from 'sharp'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareBonusAccountEntity,
    AutoCareBonusLedgerEntity,
    AutoCareBonusLedgerType,
    AutoCareRepairEventEntity,
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
    OutboxEventEntity,
    OutboxEventStatus,
} from '../../entities/index.js'
import { CabinetEntity, CabinetStatus } from '../../entities/cabinet/cabinet.entity.js'
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
import {
    createCabinetImageReadStream,
    deleteUploadedCabinetImages,
    getUploadedCabinetImageFileName,
    saveCabinetImage,
} from '../cabinets/cabinet-image-storage.js'
import {
    getAutoCareProviderLogoFileName,
    readAutoCareProviderLogo,
    removeAutoCareProviderLogo,
    saveAutoCareProviderLogo,
} from '../autocare/autocare-provider-logo-storage.js'
import {
    getAutoCareProviderMediaFileName,
    readAutoCareProviderMedia,
    removeAutoCareProviderMedia,
    saveAutoCareProviderMedia,
} from '../autocare/autocare-provider-media-storage.js'
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
    let repairEvent: AutoCareRepairEventEntity
    let deletionRequest: AccountDeletionRequestEntity
    let pendingOutboxId: string
    let completedOutboxId: string
    let deletedOwnerEmail: string
    let providerLogoUrl: string | null = null
    let providerCoverUrl: string | null = null
    let providerGalleryUrl: string | null = null
    let legacyCabinet: CabinetEntity
    let legacyCabinetPhotoUrl: string | null = null

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
        const providerImage = await sharp({
            create: { width: 32, height: 24, channels: 3, background: { r: 30, g: 100, b: 180 } },
        }).png().toBuffer()
        providerLogoUrl = await saveAutoCareProviderLogo(providerImage)
        providerCoverUrl = await saveAutoCareProviderMedia('cover', providerImage)
        providerGalleryUrl = await saveAutoCareProviderMedia('gallery', providerImage)
        provider.logoUrl = providerLogoUrl
        provider.coverImageUrl = providerCoverUrl
        provider.galleryImageUrls = [providerGalleryUrl]
        provider = await providers.save(provider)
        const cabinetImage = await sharp({
            create: { width: 48, height: 32, channels: 3, background: { r: 60, g: 130, b: 200 } },
        }).png().toBuffer()
        legacyCabinetPhotoUrl = await saveCabinetImage({ content: cabinetImage, mimeType: 'image/png' })
        const cabinets = AppDataSource.getRepository(CabinetEntity)
        legacyCabinet = await cabinets.save(cabinets.create({
            ownerId: deletedOwner.id,
            title: `Legacy retention cabinet ${suffix}`,
            description: 'Legacy cabinet used for account deletion retention tests.',
            address: 'Retention street, 2',
            city: 'Retention City',
            timezone: 'UTC',
            pricePerHour: 100,
            status: CabinetStatus.Active,
            photos: [legacyCabinetPhotoUrl],
            amenities: [],
            cancellationPolicy: null,
            houseRules: null,
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
            cancelledById: deletedOwner.id,
            cancellationReason: 'Private cancellation context',
            noShowById: deletedOwner.id,
            noShowReason: 'Private no-show context',
            completedById: deletedOwner.id,
            completionNote: 'Private completion context',
        }))
        const attachmentKey = createAutoCareAttachmentObjectKey('requests', serviceRequest.id, randomUUID())
        await saveAutoCareAttachmentObject(attachmentKey, Buffer.from('private attachment fixture'), 'image/png')
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
        await saveAutoCareAttachmentObject(providerAttachmentKey, Buffer.from('provider attachment fixture'), 'image/png')
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
        repairEvent = await AppDataSource.getRepository(AutoCareRepairEventEntity).save({
            requestId: serviceRequest.id,
            eventType: 'note_added',
            actorId: superAdmin.id,
            title: 'Private repair event context',
            notes: 'Private repair note',
            metadata: { private: true },
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
        const outbox = AppDataSource.getRepository(OutboxEventEntity)
        const pendingOutbox = await outbox.save(outbox.create({
            type: 'notification.create',
            payload: { userId: deletedOwner.id, title: 'Private notification' },
            idempotencyKey: `retention-pending-outbox-${suffix}`,
            status: OutboxEventStatus.Pending,
            attempts: 0,
            availableAt: new Date(),
            lockedAt: null,
            processedAt: null,
            lastError: null,
        }))
        pendingOutboxId = pendingOutbox.id
        const completedOutbox = await outbox.save(outbox.create({
            type: 'email.send',
            // Providers may normalize addresses differently while handing a
            // message to the outbox. Deletion must match case/whitespace too.
            payload: { email: `  ${deletedOwner.email.toUpperCase()}  `, recipientName: deletedOwner.name },
            idempotencyKey: `retention-completed-outbox-${suffix}`,
            status: OutboxEventStatus.Completed,
            attempts: 1,
            availableAt: new Date(),
            lockedAt: null,
            processedAt: new Date(),
            lastError: null,
        }))
        completedOutboxId = completedOutbox.id
    })

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return
        const logoFileName = providerLogoUrl ? getAutoCareProviderLogoFileName(providerLogoUrl) : null
        if (logoFileName) await removeAutoCareProviderLogo(logoFileName).catch(() => undefined)
        const coverFileName = providerCoverUrl ? getAutoCareProviderMediaFileName(providerCoverUrl, 'cover') : null
        if (coverFileName) await removeAutoCareProviderMedia('cover', coverFileName).catch(() => undefined)
        const galleryFileName = providerGalleryUrl ? getAutoCareProviderMediaFileName(providerGalleryUrl, 'gallery') : null
        if (galleryFileName) await removeAutoCareProviderMedia('gallery', galleryFileName).catch(() => undefined)
        if (legacyCabinetPhotoUrl) {
            const fileName = getUploadedCabinetImageFileName(legacyCabinetPhotoUrl)
            if (fileName) await deleteUploadedCabinetImages([legacyCabinetPhotoUrl]).catch(() => undefined)
        }
        await AppDataSource.getRepository(AccountDeletionRequestEntity).delete({ id: deletionRequest?.id })
        await AppDataSource.getRepository(OutboxEventEntity).delete([pendingOutboxId, completedOutboxId].filter(Boolean))
        await AppDataSource.getRepository(CabinetEntity).delete({ id: legacyCabinet?.id })
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
        expect(completed.reason).toBeNull()
        expect(await AppDataSource.getRepository(AccountDeletionRequestEntity).findOneByOrFail({ id: deletionRequest.id })).toMatchObject({
            status: AccountDeletionRequestStatus.Completed,
            reason: null,
        })
        expect(await AppDataSource.getRepository(OutboxEventEntity).findOneBy({ id: pendingOutboxId })).toBeNull()
        expect(await AppDataSource.getRepository(OutboxEventEntity).findOneByOrFail({ id: completedOutboxId })).toMatchObject({
            status: OutboxEventStatus.Completed,
            payload: { redacted: true },
        })
        expect(await AppDataSource.getRepository(ServiceAttachmentEntity).countBy({ id: attachment.id })).toBe(0)
        expect(await AppDataSource.getRepository(ServiceAttachmentEntity).countBy({ id: providerAttachment.id })).toBe(0)
        await expect(readAutoCareAttachmentObject(attachment.objectKey)).rejects.toMatchObject({ statusCode: 404 })
        await expect(readAutoCareAttachmentObject(providerAttachment.objectKey)).rejects.toMatchObject({ statusCode: 404 })
        const redactedProviderMessage = await AppDataSource.getRepository(ServiceMessageEntity).findOneByOrFail({ id: providerMessage.id })
        expect(redactedProviderMessage.body).toBeNull()
        const redactedRequest = await AppDataSource.getRepository(ServiceRequestEntity).findOneByOrFail({ id: serviceRequest.id })
        expect(redactedRequest).toMatchObject({
            cancelledById: null,
            cancellationReason: null,
            noShowById: null,
            noShowReason: null,
            completedById: null,
            completionNote: null,
        })
        const redactedRepairEvent = await AppDataSource.getRepository(AutoCareRepairEventEntity).findOneByOrFail({ id: repairEvent.id })
        expect(redactedRepairEvent).toMatchObject({
            actorId: null,
            title: 'Review removed after account deletion.',
            notes: null,
            metadata: {},
        })
        expect(await AppDataSource.getRepository(AutoCareBonusAccountEntity).countBy({ clientId: deletedOwner.id })).toBe(0)
        expect(await AppDataSource.getRepository(AutoCareBonusLedgerEntity).countBy({ clientId: deletedOwner.id })).toBe(0)
        expect(await AppDataSource.getRepository(AutomotiveProviderMembershipEntity).countBy({ userId: deletedOwner.id })).toBe(0)
        expect(await AppDataSource.getRepository(AutomotiveProviderInvitationEntity).countBy({ invitedById: deletedOwner.id })).toBe(0)
        expect(await AppDataSource.getRepository(AutomotiveProviderInvitationEntity).countBy({ email: deletedOwnerEmail })).toBe(0)

        const updatedProvider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneByOrFail({ id: provider.id })
        const anonymized = await AppDataSource.getRepository(UserEntity).findOneByOrFail({ id: deletedOwner.id })
        expect(updatedProvider).toMatchObject({
            ownerId: null,
            status: AutomotiveProviderStatus.Suspended,
            logoUrl: null,
            coverImageUrl: null,
            galleryImageUrls: [],
        })
        const logoFileName = providerLogoUrl ? getAutoCareProviderLogoFileName(providerLogoUrl) : null
        if (logoFileName) await expect(readAutoCareProviderLogo(logoFileName)).rejects.toMatchObject({ statusCode: 404 })
        const coverFileName = providerCoverUrl ? getAutoCareProviderMediaFileName(providerCoverUrl, 'cover') : null
        if (coverFileName) await expect(readAutoCareProviderMedia('cover', coverFileName)).rejects.toMatchObject({ statusCode: 404 })
        const galleryFileName = providerGalleryUrl ? getAutoCareProviderMediaFileName(providerGalleryUrl, 'gallery') : null
        if (galleryFileName) await expect(readAutoCareProviderMedia('gallery', galleryFileName)).rejects.toMatchObject({ statusCode: 404 })
        expect(await AppDataSource.getRepository(CabinetEntity).findOneByOrFail({ id: legacyCabinet.id })).toMatchObject({
            ownerId: deletedOwner.id,
            status: CabinetStatus.Blocked,
            photos: [],
        })
        const legacyFileName = legacyCabinetPhotoUrl ? getUploadedCabinetImageFileName(legacyCabinetPhotoUrl) : null
        if (legacyFileName) expect(() => createCabinetImageReadStream(legacyFileName)).toThrow(/not found/i)
        expect(anonymized).toMatchObject({ status: UserStatus.Blocked })
        expect(anonymized.email).not.toBe(`deletion-owner-${suffix}@example.com`)
        const invariantResults = await checkAutoCareDeletionInvariants(AppDataSource, deletedOwner.id)
        expect(invariantResults.every(({ count }) => count === 0)).toBe(true)
    })
})
