import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareTrustEvidenceEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveReviewEntity,
    AutomotiveReviewStatus,
} from '../../entities/index.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { decideAdminAutoCareModerationEvidence, queueReviewModerationEvidence } from './moderation-evidence.service.js'
import { updateClientAutoCareReview } from './provider-reviews-write.service.js'
import { decideAdminAutoCareReview } from './review-moderation.service.js'

describe('review revision and moderation evidence transaction', () => {
    const suffix = `${Date.now()}`
    let client: UserEntity
    let admin: UserEntity
    let provider: AutomotiveProviderEntity
    let review: AutomotiveReviewEntity
    let originalEvidence: AutoCareTrustEvidenceEntity

    beforeAll(async () => {
        const users = AppDataSource.getRepository(UserEntity)
        ;[client, admin] = await users.save([
            users.create({ name: 'Revision client', email: `revision-client-${suffix}@example.com`, passwordHash: 'hash', role: UserRole.Client, status: UserStatus.Active, emailVerifiedAt: new Date() }),
            users.create({ name: 'Revision admin', email: `revision-admin-${suffix}@example.com`, passwordHash: 'hash', role: UserRole.Admin, status: UserStatus.Active, emailVerifiedAt: new Date() }),
        ])
        const providers = AppDataSource.getRepository(AutomotiveProviderEntity)
        provider = await providers.save(providers.create({
            ownerId: null,
            name: `Revision garage ${suffix}`,
            status: AutomotiveProviderStatus.Active,
            verified: false,
            yearsActive: 0,
            staffCount: 1,
            rating: 0,
            reviewCount: 0,
            workstationCount: 1,
        }))
        const reviews = AppDataSource.getRepository(AutomotiveReviewEntity)
        review = await reviews.save(reviews.create({
            providerId: provider.id,
            authorName: client.name,
            vehicleLabel: 'Test car',
            rating: 2,
            text: 'Original review text',
            avatarUrl: null,
            photoUrls: [],
            clientId: client.id,
            serviceRequestId: null,
            verifiedVisit: false,
            serviceSlug: null,
            status: AutomotiveReviewStatus.Pending,
            contentRevision: 1,
            revisionAllowedUntil: new Date(Date.now() + 60_000),
            revisionUsedAt: null,
        }))
        originalEvidence = await queueReviewModerationEvidence(AppDataSource.manager, review)
    })

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return
        if (provider) await AppDataSource.getRepository(AutoCareTrustEvidenceEntity).delete({ providerId: provider.id })
        if (provider) await AppDataSource.getRepository(AutomotiveReviewEntity).delete({ providerId: provider.id })
        if (provider) await AppDataSource.getRepository(AutomotiveProviderEntity).delete({ id: provider.id })
        const ids = [client?.id, admin?.id].filter((id): id is string => Boolean(id))
        if (ids.length > 0) await AppDataSource.getRepository(UserEntity).delete(ids)
    })

    it('consumes one edit and lets only the current evidence moderate it', async () => {
        const results = await Promise.allSettled([
            updateClientAutoCareReview(client, review.id, { rating: 4, text: 'First revision of the review' }),
            updateClientAutoCareReview(client, review.id, { rating: 5, text: 'Second revision of the review' }),
        ])
        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
        const rejected = results.find((result) => result.status === 'rejected')
        expect(rejected).toMatchObject({ reason: { statusCode: 409 } })

        const saved = await AppDataSource.getRepository(AutomotiveReviewEntity).findOneByOrFail({ id: review.id })
        expect(saved.contentRevision).toBe(2)
        expect(saved.revisionUsedAt).not.toBeNull()
        expect(saved.status).toBe(AutomotiveReviewStatus.Pending)

        const evidence = await AppDataSource.getRepository(AutoCareTrustEvidenceEntity).find({
            where: { kind: 'review', referenceIndex: review.id },
            order: { createdAt: 'ASC' },
        })
        expect(evidence).toHaveLength(2)
        expect(evidence.find((item) => item.id === originalEvidence.id)).toMatchObject({ status: 'superseded', reviewRevision: 1 })
        const current = evidence.find((item) => item.reviewRevision === 2)
        expect(current).toMatchObject({ status: 'pending' })

        await expect(decideAdminAutoCareModerationEvidence(admin, originalEvidence.id, { status: 'approved', reason: 'Old version' }))
            .rejects.toMatchObject({ statusCode: 409 })
        await decideAdminAutoCareModerationEvidence(admin, current!.id, { status: 'approved', reason: 'Current version' })
        const moderated = await AppDataSource.getRepository(AutomotiveReviewEntity).findOneByOrFail({ id: review.id })
        expect(moderated.status).toBe(AutomotiveReviewStatus.Approved)
    })

    it('makes the direct review decision update only the matching evidence revision', async () => {
        const reviews = AppDataSource.getRepository(AutomotiveReviewEntity)
        const another = await reviews.save(reviews.create({
            providerId: provider.id,
            authorName: client.name,
            vehicleLabel: 'Second test car',
            rating: 2,
            text: 'Original second review',
            avatarUrl: null,
            photoUrls: [],
            clientId: client.id,
            serviceRequestId: null,
            verifiedVisit: false,
            serviceSlug: null,
            status: AutomotiveReviewStatus.Pending,
            contentRevision: 1,
            revisionAllowedUntil: new Date(Date.now() + 60_000),
            revisionUsedAt: null,
        }))
        const firstEvidence = await queueReviewModerationEvidence(AppDataSource.manager, another)
        await updateClientAutoCareReview(client, another.id, { rating: 3, text: 'Updated second review' })

        await decideAdminAutoCareReview(admin, another.id, { status: AutomotiveReviewStatus.Approved })

        const evidence = await AppDataSource.getRepository(AutoCareTrustEvidenceEntity).find({
            where: { kind: 'review', referenceIndex: another.id },
        })
        expect(evidence.find((item) => item.id === firstEvidence.id)?.status).toBe('superseded')
        expect(evidence.find((item) => item.reviewRevision === 2)?.status).toBe('approved')
        expect((await reviews.findOneByOrFail({ id: another.id })).status).toBe(AutomotiveReviewStatus.Approved)
    })
})
