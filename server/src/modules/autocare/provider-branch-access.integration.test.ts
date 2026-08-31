import { createHash, randomUUID } from 'node:crypto'

import type { FastifyInstance } from 'fastify'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '../../app.js'
import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareCapacityResourceEntity,
    AutoCareChatThreadEntity,
    AutoCareChatThreadStatus,
    AutoCareChatThreadType,
    AutomotiveBookingMode,
    AutomotiveMarketCountryEntity,
    AutomotiveMarketEntity,
    AutomotivePriceType,
    AutomotiveProviderEntity,
    AutomotiveProviderChangeRequestEntity,
    AutomotiveProviderInvitationEntity,
    AutomotiveProviderMembershipEntity,
    AutomotiveProviderMembershipRole,
    AutomotiveProviderMembershipStatus,
    AutomotiveProviderStatus,
    AutomotiveReviewEntity,
    AutomotiveReviewStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
    ServiceAttachmentEntity,
    ServiceAttachmentStatus,
    ServiceRequestEntity,
    ServiceRequestStatus,
} from '../../entities/index.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { createAuthTokens } from '../auth/auth.service.js'
import {
    createAutoCareAttachmentObjectKey,
    removeAutoCareAttachmentObject,
    saveAutoCareAttachmentObject,
} from './autocare-attachment-storage.js'

describe('AutoCare branch-scoped HTTP authorization', () => {
    const suffix = `${Date.now()}`
    let app: FastifyInstance
    let owner: UserEntity
    let admin: UserEntity
    let manager: UserEntity
    let staff: UserEntity
    let client: UserEntity
    let invitee: UserEntity
    let country: AutomotiveMarketCountryEntity
    let market: AutomotiveMarketEntity
    let provider: AutomotiveProviderEntity
    let locationA: AutomotiveServiceLocationEntity
    let locationB: AutomotiveServiceLocationEntity
    let definition: AutomotiveServiceDefinitionEntity
    let offeringA: AutomotiveServiceOfferingEntity
    let offeringB: AutomotiveServiceOfferingEntity
    let requestA: ServiceRequestEntity
    let requestB: ServiceRequestEntity
    let chatA: AutoCareChatThreadEntity
    let chatB: AutoCareChatThreadEntity
    let reviewA: AutomotiveReviewEntity
    let reviewB: AutomotiveReviewEntity
    let attachmentA: ServiceAttachmentEntity
    let attachmentB: ServiceAttachmentEntity
    let rejectedAttachmentA: ServiceAttachmentEntity

    const token = (user: UserEntity) => createAuthTokens(user).accessToken

    beforeAll(async () => {
        app = await buildApp()
        await app.ready()

        const userRepository = AppDataSource.getRepository(UserEntity)
        const createUser = (name: string, role: UserRole) => userRepository.create({
            name,
            email: `${name.toLowerCase().replaceAll(' ', '-')}-${suffix}@example.com`,
            passwordHash: 'hash',
            role,
            status: UserStatus.Active,
            emailVerifiedAt: new Date(),
        })
        ;[owner, admin, manager, staff, client, invitee] = await userRepository.save([
            createUser('Branch Owner', UserRole.Owner),
            createUser('Branch Admin', UserRole.Admin),
            createUser('Branch Manager', UserRole.Owner),
            createUser('Branch Staff', UserRole.Owner),
            createUser('Branch Client', UserRole.Client),
            createUser('Branch Invitee', UserRole.Client),
        ])

        country = await AppDataSource.getRepository(AutomotiveMarketCountryEntity).save(
            AppDataSource.getRepository(AutomotiveMarketCountryEntity).create({
                code: `BA-${suffix}`,
                names: { en: 'Branch access test' },
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
                countryCode: 'BA',
                countryName: 'Branch access test',
                cityCode: `branch-access-${suffix}`,
                cityName: 'Branch access test',
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
                name: `Branch access garage ${suffix}`,
                description: null,
                status: AutomotiveProviderStatus.Active,
                verified: false,
                yearsActive: 0,
                staffCount: 3,
                rating: 4.5,
                reviewCount: 2,
                workstationCount: 2,
            }),
        )
        const locationRepository = AppDataSource.getRepository(AutomotiveServiceLocationEntity)
        ;[locationA, locationB] = await locationRepository.save([
            locationRepository.create({
                providerId: provider.id,
                marketId: market.id,
                zoneId: null,
                address: 'Branch A, 1',
                hours: '08:00-20:00',
                appointmentCapacity: 1,
                timezone: 'UTC',
                blackoutDates: [],
                latitude: null,
                longitude: null,
                supportsMobile: false,
                supportsPickup: false,
                coverageRadiusKm: null,
                dispatchBasePriceMinor: 0,
                etaMinutes: null,
            }),
            locationRepository.create({
                providerId: provider.id,
                marketId: market.id,
                zoneId: null,
                address: 'Branch B, 2',
                hours: '08:00-20:00',
                appointmentCapacity: 1,
                timezone: 'UTC',
                blackoutDates: [],
                latitude: null,
                longitude: null,
                supportsMobile: false,
                supportsPickup: false,
                coverageRadiusKm: null,
                dispatchBasePriceMinor: 0,
                etaMinutes: null,
            }),
        ])
        definition = await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).save(
            AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).create({
                slug: `branch-service-${suffix}`,
                categorySlug: 'maintenance',
                labels: { en: 'Branch service' },
                priceType: AutomotivePriceType.From,
                comparisonAttributes: [],
                active: true,
            }),
        )
        const offeringRepository = AppDataSource.getRepository(AutomotiveServiceOfferingEntity)
        ;[offeringA, offeringB] = await offeringRepository.save([
            offeringRepository.create({
                locationId: locationA.id,
                definitionId: definition.id,
                description: 'Visible branch offer',
                priceFromMinor: 1_000,
                priceToMinor: null,
                currencyCode: 'USD',
                durationMinutes: 60,
                inclusions: [],
                warrantyText: null,
                active: true,
                bookingMode: AutomotiveBookingMode.Request,
            }),
            offeringRepository.create({
                locationId: locationB.id,
                definitionId: definition.id,
                description: 'Hidden branch offer',
                priceFromMinor: 2_000,
                priceToMinor: null,
                currencyCode: 'USD',
                durationMinutes: 60,
                inclusions: [],
                warrantyText: null,
                active: true,
                bookingMode: AutomotiveBookingMode.Request,
            }),
        ])

        const membershipRepository = AppDataSource.getRepository(AutomotiveProviderMembershipEntity)
        await membershipRepository.save([
            membershipRepository.create({
                providerId: provider.id,
                userId: manager.id,
                locationId: locationA.id,
                role: AutomotiveProviderMembershipRole.Manager,
                status: AutomotiveProviderMembershipStatus.Active,
            }),
            membershipRepository.create({
                providerId: provider.id,
                userId: staff.id,
                locationId: locationA.id,
                role: AutomotiveProviderMembershipRole.Staff,
                status: AutomotiveProviderMembershipStatus.Active,
            }),
        ])

        const requestRepository = AppDataSource.getRepository(ServiceRequestEntity)
        const requestFixture = (location: AutomotiveServiceLocationEntity, offering: AutomotiveServiceOfferingEntity, note: string) => requestRepository.create({
            clientId: client.id,
            providerId: provider.id,
            locationId: location.id,
            definitionId: definition.id,
            offeringId: offering.id,
            offeringSnapshot: {
                serviceSlug: definition.slug,
                serviceLabels: definition.labels,
                description: offering.description,
                priceFromMinor: offering.priceFromMinor,
                priceToMinor: offering.priceToMinor,
                currencyCode: offering.currencyCode,
                durationMinutes: offering.durationMinutes,
                inclusions: [],
                warrantyText: null,
                priceType: definition.priceType,
                bookingMode: offering.bookingMode,
            },
            vehicleSnapshot: null,
            contactSnapshot: {},
            preferredAt: new Date(Date.now() + 86_400_000),
            note,
            idempotencyKey: null,
            status: ServiceRequestStatus.AwaitingReply,
            clientConfirmedAt: new Date(),
            providerConfirmedAt: null,
        })
        ;[requestA, requestB] = await requestRepository.save([
            requestFixture(locationA, offeringA, 'Visible branch request'),
            requestFixture(locationB, offeringB, 'Hidden branch request'),
        ])

        const chatRepository = AppDataSource.getRepository(AutoCareChatThreadEntity)
        ;[chatA, chatB] = await chatRepository.save([
            chatRepository.create({ type: AutoCareChatThreadType.ServiceRequest, requestId: requestA.id, providerId: provider.id, clientId: client.id, createdById: client.id, subject: 'Visible chat', status: AutoCareChatThreadStatus.Open, lastMessageAt: null }),
            chatRepository.create({ type: AutoCareChatThreadType.ServiceRequest, requestId: requestB.id, providerId: provider.id, clientId: client.id, createdById: client.id, subject: 'Hidden chat', status: AutoCareChatThreadStatus.Open, lastMessageAt: null }),
        ])

        const reviewRepository = AppDataSource.getRepository(AutomotiveReviewEntity)
        ;[reviewA, reviewB] = await reviewRepository.save([
            reviewRepository.create({ providerId: provider.id, authorName: 'Branch A client', vehicleLabel: 'Car A', rating: 5, text: 'Visible review', avatarUrl: null, photoUrls: [], clientId: client.id, serviceRequestId: requestA.id, verifiedVisit: true, serviceSlug: definition.slug, revisionAllowedUntil: null, revisionUsedAt: null, status: AutomotiveReviewStatus.Approved }),
            reviewRepository.create({ providerId: provider.id, authorName: 'Branch B client', vehicleLabel: 'Car B', rating: 1, text: 'Hidden review', avatarUrl: null, photoUrls: [], clientId: client.id, serviceRequestId: requestB.id, verifiedVisit: true, serviceSlug: definition.slug, revisionAllowedUntil: null, revisionUsedAt: null, status: AutomotiveReviewStatus.Approved }),
        ])

        const attachmentContent = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
        const attachmentRepository = AppDataSource.getRepository(ServiceAttachmentEntity)
        const attachmentFixture = async (
            serviceRequest: ServiceRequestEntity,
            chat: AutoCareChatThreadEntity,
            status: ServiceAttachmentStatus,
        ) => {
            const objectKey = createAutoCareAttachmentObjectKey('requests', serviceRequest.id, randomUUID())
            await saveAutoCareAttachmentObject(objectKey, attachmentContent, 'image/png')
            return attachmentRepository.save(attachmentRepository.create({
                requestId: serviceRequest.id,
                threadId: chat.id,
                uploadedById: client.id,
                objectKey,
                contentType: 'image/png',
                bytes: attachmentContent.length,
                checksum: createHash('sha256').update(attachmentContent).digest('hex'),
                status,
            }))
        }
        ;[attachmentA, attachmentB, rejectedAttachmentA] = await Promise.all([
            attachmentFixture(requestA, chatA, ServiceAttachmentStatus.Ready),
            attachmentFixture(requestB, chatB, ServiceAttachmentStatus.Ready),
            attachmentFixture(requestA, chatA, ServiceAttachmentStatus.Rejected),
        ])
    })

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return
        if (provider) await AppDataSource.getRepository(AutomotiveProviderChangeRequestEntity).delete({ providerId: provider.id })
        if (provider) await AppDataSource.getRepository(AutoCareCapacityResourceEntity).delete({ providerId: provider.id })
        const attachments = [attachmentA, attachmentB, rejectedAttachmentA].filter((item): item is ServiceAttachmentEntity => Boolean(item))
        if (attachments.length > 0) {
            await AppDataSource.getRepository(ServiceAttachmentEntity).delete(attachments.map(({ id }) => id))
            await Promise.all(attachments.map(({ objectKey }) => removeAutoCareAttachmentObject(objectKey)))
        }
        if (chatA || chatB) await AppDataSource.getRepository(AutoCareChatThreadEntity).delete([chatA?.id, chatB?.id].filter((id): id is string => Boolean(id)))
        if (reviewA || reviewB) await AppDataSource.getRepository(AutomotiveReviewEntity).delete([reviewA?.id, reviewB?.id].filter((id): id is string => Boolean(id)))
        if (requestA || requestB) await AppDataSource.getRepository(ServiceRequestEntity).delete([requestA?.id, requestB?.id].filter((id): id is string => Boolean(id)))
        if (provider) await AppDataSource.getRepository(AutomotiveProviderMembershipEntity).delete({ providerId: provider.id })
        if (provider) await AppDataSource.getRepository(AutomotiveProviderInvitationEntity).delete({ providerId: provider.id })
        if (offeringA || offeringB) await AppDataSource.getRepository(AutomotiveServiceOfferingEntity).delete([offeringA?.id, offeringB?.id].filter((id): id is string => Boolean(id)))
        if (definition) await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).delete({ id: definition.id })
        if (locationA || locationB) await AppDataSource.getRepository(AutomotiveServiceLocationEntity).delete([locationA?.id, locationB?.id].filter((id): id is string => Boolean(id)))
        if (provider) await AppDataSource.getRepository(AutomotiveProviderEntity).delete({ id: provider.id })
        if (market) await AppDataSource.getRepository(AutomotiveMarketEntity).delete({ id: market.id })
        if (country) await AppDataSource.getRepository(AutomotiveMarketCountryEntity).delete({ id: country.id })
        await AppDataSource.getRepository(UserEntity).delete([owner?.id, admin?.id, manager?.id, staff?.id, client?.id, invitee?.id].filter((id): id is string => Boolean(id)))
        await app.close()
    })

    it('projects only the assigned branch in catalog and request lists', async () => {
        const managerToken = token(manager)
        const staffToken = token(staff)
        const ownerToken = token(owner)
        const [managerCatalog, staffCatalog, ownerCatalog, managerRequests, staffRequests] = await Promise.all([
            request(app.server).get('/owner/autocare-providers').set('Authorization', `Bearer ${managerToken}`),
            request(app.server).get('/owner/autocare-providers').set('Authorization', `Bearer ${staffToken}`),
            request(app.server).get('/owner/autocare-providers').set('Authorization', `Bearer ${ownerToken}`),
            request(app.server).get('/owner/service-requests').set('Authorization', `Bearer ${managerToken}`),
            request(app.server).get('/owner/service-requests').set('Authorization', `Bearer ${staffToken}`),
        ])

        expect(managerCatalog.status).toBe(200)
        expect(managerCatalog.body).toHaveLength(1)
        expect(managerCatalog.body[0].locations.map((item: { location: { id: string } }) => item.location.id)).toEqual([locationA.id])
        expect(staffCatalog.status).toBe(200)
        expect(staffCatalog.body).toEqual([])
        expect(ownerCatalog.body[0].locations.map((item: { location: { id: string } }) => item.location.id)).toEqual(expect.arrayContaining([locationA.id, locationB.id]))
        expect(managerRequests.body.map((item: { id: string }) => item.id)).toEqual([requestA.id])
        expect(staffRequests.body.map((item: { id: string }) => item.id)).toEqual([requestA.id])
    })

    it('denies direct request, chat and mutation access to another branch', async () => {
        const managerToken = token(manager)
        const [requestAResponse, requestBResponse, chats, chatBResponse, requestBMessage, requestBQuote, chatBMessage] = await Promise.all([
            request(app.server).get(`/v1/service-requests/${requestA.id}`).set('Authorization', `Bearer ${managerToken}`),
            request(app.server).get(`/v1/service-requests/${requestB.id}`).set('Authorization', `Bearer ${managerToken}`),
            request(app.server).get('/v1/chats').set('Authorization', `Bearer ${managerToken}`),
            request(app.server).get(`/v1/chats/${chatB.id}`).set('Authorization', `Bearer ${managerToken}`),
            request(app.server)
                .post(`/owner/service-requests/${requestB.id}/quote`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ amountMinor: 2_000, currencyCode: 'USD', note: 'Forbidden quote', taxMinor: 0, feesMinor: 0, priceLocked: false }),
            request(app.server)
                .post(`/v1/service-requests/${requestB.id}/messages`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ body: 'Forbidden message' }),
            request(app.server)
                .post(`/v1/chats/${chatB.id}/messages`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ body: 'Forbidden chat message' }),
        ])

        expect(requestAResponse.status).toBe(200)
        expect(requestBResponse.status).toBe(403)
        expect(chats.body.map((item: { id: string }) => item.id)).toEqual([chatA.id])
        expect(chatBResponse.status).toBe(403)
        expect(requestBMessage.status).toBe(403)
        expect(requestBQuote.status).toBe(403)
        expect(chatBMessage.status).toBe(403)
    })

    it('scopes reviews and analytics by capability and branch', async () => {
        const managerToken = token(manager)
        const staffToken = token(staff)
        const [managerReviews, staffReviews, managerAnalytics, staffAnalytics] = await Promise.all([
            request(app.server).get(`/owner/autocare-providers/${provider.id}/reviews`).set('Authorization', `Bearer ${managerToken}`),
            request(app.server).get(`/owner/autocare-providers/${provider.id}/reviews`).set('Authorization', `Bearer ${staffToken}`),
            request(app.server).get(`/owner/autocare-providers/${provider.id}/analytics`).set('Authorization', `Bearer ${managerToken}`),
            request(app.server).get(`/owner/autocare-providers/${provider.id}/analytics`).set('Authorization', `Bearer ${staffToken}`),
        ])

        expect(managerReviews.status).toBe(200)
        expect(managerReviews.body.reviews.map((item: { id: string }) => item.id)).toEqual([reviewA.id])
        expect(staffReviews.status).toBe(404)
        expect(managerAnalytics.status).toBe(200)
        expect(managerAnalytics.body).toMatchObject({ inquiries: 1, reviewCount: 1, averageRating: 5 })
        expect(staffAnalytics.status).toBe(403)
    })

    it('keeps review discounts branch-scoped and bonus liability owner-only', async () => {
        const managerToken = token(manager)
        const [reviewPromo, bonusLiability] = await Promise.all([
            request(app.server)
                .post(`/owner/autocare-providers/${provider.id}/reviews/${reviewB.id}/promos`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ discountPercent: 15, expiresInDays: 7 }),
            request(app.server)
                .get(`/owner/autocare-providers/${provider.id}/bonus-liability`)
                .set('Authorization', `Bearer ${managerToken}`),
        ])

        expect(reviewPromo.status).toBe(404)
        expect(bonusLiability.status).toBe(403)
    })

    it('prevents capacity and offer mutations against another branch', async () => {
        const managerToken = token(manager)
        const [resourcesA, resourcesB, offerBUpdate] = await Promise.all([
            request(app.server).get(`/owner/autocare-providers/${provider.id}/resources`).query({ locationId: locationA.id }).set('Authorization', `Bearer ${managerToken}`),
            request(app.server).get(`/owner/autocare-providers/${provider.id}/resources`).query({ locationId: locationB.id }).set('Authorization', `Bearer ${managerToken}`),
            request(app.server)
                .patch(`/owner/autocare-providers/${provider.id}/offers/${offeringB.id}`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ description: 'Forbidden update', priceFromMinor: 2_500 }),
        ])

        expect(resourcesA.status).toBe(200)
        expect(resourcesA.body.every((item: { locationId: string }) => item.locationId === locationA.id)).toBe(true)
        expect(resourcesB.status).toBe(403)
        expect(offerBUpdate.status).toBe(404)
    })

    it('serves only ready attachments inside the assigned branch', async () => {
        const managerToken = token(manager)
        const [ready, anotherBranch, rejected, conversation, chat] = await Promise.all([
            request(app.server).get(`/v1/service-requests/${requestA.id}/attachments/${attachmentA.id}`).set('Authorization', `Bearer ${managerToken}`),
            request(app.server).get(`/v1/service-requests/${requestB.id}/attachments/${attachmentB.id}`).set('Authorization', `Bearer ${managerToken}`),
            request(app.server).get(`/v1/service-requests/${requestA.id}/attachments/${rejectedAttachmentA.id}`).set('Authorization', `Bearer ${managerToken}`),
            request(app.server).get(`/v1/service-requests/${requestA.id}/conversation`).set('Authorization', `Bearer ${managerToken}`),
            request(app.server).get(`/v1/chats/${chatA.id}`).set('Authorization', `Bearer ${managerToken}`),
        ])

        expect(ready.status).toBe(200)
        expect(ready.headers['content-type']).toContain('image/png')
        expect(anotherBranch.status).toBe(403)
        expect(rejected.status).toBe(404)
        expect(conversation.body.attachments.map((item: { id: string }) => item.id)).toEqual([attachmentA.id])
        expect(chat.body.attachments.map((item: { id: string }) => item.id)).toEqual([attachmentA.id])
    })

    it('lets the owner accept and revoke a branch-scoped invitation', async () => {
        const ownerToken = token(owner)
        const inviteeToken = token(invitee)
        const invitation = await request(app.server)
            .post(`/owner/autocare-providers/${provider.id}/members/invitations`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ email: invitee.email, role: 'staff', locationId: locationA.id })

        expect(invitation.status).toBe(200)
        expect(invitation.body).toMatchObject({ providerId: provider.id, email: invitee.email, role: 'staff', locationId: locationA.id, status: 'pending' })
        expect(invitation.body.inviteToken).toEqual(expect.any(String))

        const accepted = await request(app.server)
            .post('/owner/autocare-provider-invitations/accept')
            .set('Authorization', `Bearer ${inviteeToken}`)
            .send({ token: invitation.body.inviteToken })

        expect(accepted.status).toBe(200)
        expect(accepted.body.membership).toMatchObject({ providerId: provider.id, userId: invitee.id, locationId: locationA.id, role: 'staff', status: 'active' })
        expect(accepted.body.invitation).toMatchObject({ id: invitation.body.id, status: 'accepted', inviteToken: null })

        const revoked = await request(app.server)
            .delete(`/owner/autocare-providers/${provider.id}/members/${accepted.body.membership.id}`)
            .set('Authorization', `Bearer ${ownerToken}`)

        expect(revoked.status).toBe(200)
        expect(revoked.body).toMatchObject({ id: accepted.body.membership.id, locationId: locationA.id, status: 'revoked' })
    })

    it('replays an owner change request through an admin decision with a reason', async () => {
        const requestedDescription = `Approved branch profile ${suffix}`
        const pending = await request(app.server)
            .post(`/owner/autocare-providers/${provider.id}/change-requests`)
            .set('Authorization', `Bearer ${token(owner)}`)
            .send({ kind: 'profile_update', payload: { description: requestedDescription } })

        expect(pending.status).toBe(200)
        expect(pending.body).toMatchObject({
            providerId: provider.id,
            requestedById: owner.id,
            kind: 'profile_update',
            status: 'pending',
            payload: { description: requestedDescription },
        })

        const decision = await request(app.server)
            .patch(`/admin/autocare-provider-change-requests/${pending.body.id}/decision`)
            .set('Authorization', `Bearer ${token(admin)}`)
            .send({ status: 'approved', reason: 'The updated profile content is accurate.' })

        expect(decision.status).toBe(200)
        expect(decision.body).toMatchObject({
            id: pending.body.id,
            status: 'approved',
            reviewedById: admin.id,
            reviewReason: 'The updated profile content is accurate.',
        })
        await expect(AppDataSource.getRepository(AutomotiveProviderEntity).findOneByOrFail({ id: provider.id }))
            .resolves.toMatchObject({ description: requestedDescription })
    })
})
