import type { FastifyInstance } from 'fastify'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '../../app.js'
import { AppDataSource } from '../../database/data-source.js'
import { AuditAction, AuditLogEntity } from '../../entities/audit-log/audit-log.entity.js'
import { CabinetEntity, CabinetStatus } from '../../entities/cabinet/cabinet.entity.js'
import {
    AutoCareAppealEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutoCareTrustEvidenceEntity,
    OutboxEventEntity,
} from '../../entities/index.js'
import { AutoCareAppealSubject } from '../../entities/automotive/appeal.entity.js'
import {
    SystemIncidentEntity,
    SystemIncidentSeverity,
    SystemIncidentStatus,
    SystemIncidentType,
} from '../../entities/system-incident/system-incident.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { createAuthTokens } from '../auth/auth.service.js'

describe('Admin and workspace authorization integration', () => {
    const suffix = `${Date.now()}`
    let app: FastifyInstance
    let provider: AutomotiveProviderEntity
    let cabinet: CabinetEntity
    let evidence: AutoCareTrustEvidenceEntity
    let moderationEvidence: AutoCareTrustEvidenceEntity
    let incident: SystemIncidentEntity
    let appealId: string | null = null
    let providerOwner: UserEntity
    let otherOwner: UserEntity
    let admin: UserEntity
    let superAdmin: UserEntity

    beforeAll(async () => {
        app = await buildApp()
        await app.ready()

        const users = AppDataSource.getRepository(UserEntity)
        const createUser = (name: string, role: UserRole) => users.create({
            name,
            email: `${name.toLowerCase().replaceAll(' ', '-')}-${suffix}@example.com`,
            passwordHash: 'hash',
            role,
            status: UserStatus.Active,
            emailVerifiedAt: new Date(),
        })
        ;[providerOwner, otherOwner, admin, superAdmin] = await users.save([
            createUser('Authorization Provider Owner', UserRole.Owner),
            createUser('Authorization Other Owner', UserRole.Owner),
            createUser('Authorization Admin', UserRole.Admin),
            createUser('Authorization Super Admin', UserRole.SuperAdmin),
        ])

        const providers = AppDataSource.getRepository(AutomotiveProviderEntity)
        provider = await providers.save(providers.create({
            ownerId: providerOwner.id,
            name: `Authorization Garage ${suffix}`,
            description: null,
            status: AutomotiveProviderStatus.Active,
            verified: false,
            yearsActive: 0,
            staffCount: 1,
            rating: 0,
            reviewCount: 0,
            workstationCount: 1,
        }))

        const cabinets = AppDataSource.getRepository(CabinetEntity)
        cabinet = await cabinets.save(cabinets.create({
            ownerId: providerOwner.id,
            title: `Authorization cabinet ${suffix}`,
            description: 'A private schedule fixture used to verify ownership access.',
            address: 'Authorization street, 1',
            city: 'Authorization City',
            timezone: 'UTC',
            pricePerHour: 1_000,
            status: CabinetStatus.Active,
            photos: [],
            amenities: [],
            cancellationPolicy: null,
            houseRules: null,
        }))

        const evidenceRepository = AppDataSource.getRepository(AutoCareTrustEvidenceEntity)
        evidence = await evidenceRepository.save(evidenceRepository.create({
            providerId: provider.id,
            kind: 'registration_document',
            label: 'Registration document',
            status: 'approved',
            reference: 'private://authorization-test-document',
            notes: 'Private moderation note',
            expiresAt: null,
            verifiedById: superAdmin.id,
            verifiedAt: new Date(),
        }))
        moderationEvidence = await evidenceRepository.save(evidenceRepository.create({
            providerId: provider.id,
            kind: 'provider_gallery',
            label: 'Provider gallery fixture',
            status: 'pending',
            reference: 'https://media.example.test/authorization-gallery.webp',
            notes: 'Awaiting moderation decision',
            expiresAt: null,
            verifiedById: null,
            verifiedAt: null,
        }))

        const incidents = AppDataSource.getRepository(SystemIncidentEntity)
        const now = new Date()
        incident = await incidents.save(incidents.create({
            type: SystemIncidentType.BackgroundJob,
            severity: SystemIncidentSeverity.Warning,
            status: SystemIncidentStatus.Open,
            title: `Authorization incident ${suffix}`,
            requestId: null,
            metadata: { source: 'authorization-integration-test' },
            occurrenceCount: 1,
            firstOccurredAt: now,
            lastOccurredAt: now,
            acknowledgedAt: null,
            resolvedAt: null,
        }))
    })

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return

        // Audit records are intentionally append-only. This integration test
        // verifies that invariant and must not bypass it during cleanup.
        if (appealId) {
            await AppDataSource.getRepository(OutboxEventEntity).delete({
                idempotencyKey: `notification:autocare-appeal:${appealId}:accepted`,
            })
        }
        await AppDataSource.getRepository(AutoCareAppealEntity).delete({ submittedById: providerOwner?.id })
        if (incident) await AppDataSource.getRepository(SystemIncidentEntity).delete({ id: incident.id })
        if (moderationEvidence) await AppDataSource.getRepository(AutoCareTrustEvidenceEntity).delete({ id: moderationEvidence.id })
        if (evidence) await AppDataSource.getRepository(AutoCareTrustEvidenceEntity).delete({ id: evidence.id })
        if (cabinet) await AppDataSource.getRepository(CabinetEntity).delete({ id: cabinet.id })
        if (provider) await AppDataSource.getRepository(AutomotiveProviderEntity).delete({ id: provider.id })
        await AppDataSource.getRepository(UserEntity).delete([
            providerOwner?.id,
            otherOwner?.id,
            admin?.id,
            superAdmin?.id,
        ].filter((id): id is string => Boolean(id)))
        await app.close()
    })

    it('enforces provider membership and schedule ownership at route boundaries', async () => {
        const ownerToken = createAuthTokens(providerOwner).accessToken
        const otherOwnerToken = createAuthTokens(otherOwner).accessToken

        const forbiddenMemberships = await request(app.server)
            .get(`/owner/autocare-providers/${provider.id}/members`)
            .set('Authorization', `Bearer ${otherOwnerToken}`)
        const permittedMemberships = await request(app.server)
            .get(`/owner/autocare-providers/${provider.id}/members`)
            .set('Authorization', `Bearer ${ownerToken}`)
        const forbiddenSchedule = await request(app.server)
            .get(`/owner/cabinets/${cabinet.id}/schedule`)
            .set('Authorization', `Bearer ${otherOwnerToken}`)
        const permittedSchedule = await request(app.server)
            .get(`/owner/cabinets/${cabinet.id}/schedule`)
            .set('Authorization', `Bearer ${ownerToken}`)
        const forbiddenEvidence = await request(app.server)
            .get(`/owner/autocare-providers/${provider.id}/evidence`)
            .set('Authorization', `Bearer ${otherOwnerToken}`)
        const permittedEvidence = await request(app.server)
            .get(`/owner/autocare-providers/${provider.id}/evidence`)
            .set('Authorization', `Bearer ${ownerToken}`)

        expect(forbiddenMemberships.status).toBe(403)
        expect(permittedMemberships.status).toBe(200)
        expect(forbiddenSchedule.status).toBe(404)
        expect(permittedSchedule.status).toBe(200)
        expect(forbiddenEvidence.status).toBe(404)
        expect(permittedEvidence.status).toBe(200)
        expect(permittedEvidence.body).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: evidence.id, providerId: provider.id }),
        ]))
    })

    it('returns a bounded public trust contract without private moderation evidence', async () => {
        const response = await request(app.server).get(`/v1/providers/${provider.id}/trust`)

        expect(response.status).toBe(200)
        expect(response.body.evidence).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: evidence.id, label: evidence.label, status: 'approved' }),
        ]))
        // Pending media is visible to moderators only; it must not leak into
        // the public trust contract before a decision is recorded.
        expect(response.body.evidence).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ id: moderationEvidence.id }),
        ]))
        const publicEvidence = response.body.evidence.find((item: { id: string }) => item.id === evidence.id)
        expect(publicEvidence).not.toHaveProperty('reference')
        expect(publicEvidence).not.toHaveProperty('notes')
        expect(publicEvidence).not.toHaveProperty('verifiedById')
    })

    it('keeps platform overview super-admin scoped', async () => {
        const adminToken = createAuthTokens(admin).accessToken
        const superAdminToken = createAuthTokens(superAdmin).accessToken

        const forbidden = await request(app.server)
            .get('/super-admin/platform-overview')
            .set('Authorization', `Bearer ${adminToken}`)
        const overview = await request(app.server)
            .get('/super-admin/platform-overview')
            .set('Authorization', `Bearer ${superAdminToken}`)

        expect(forbidden.status).toBe(403)
        expect(overview.status).toBe(200)
        expect(overview.body).not.toHaveProperty('billing')
    })

    it('keeps market hierarchy and audit access separated by role', async () => {
        const ownerToken = createAuthTokens(providerOwner).accessToken
        const adminToken = createAuthTokens(admin).accessToken
        const superAdminToken = createAuthTokens(superAdmin).accessToken

        const ownerHierarchy = await request(app.server)
            .get('/super-admin/market-hierarchy')
            .set('Authorization', `Bearer ${ownerToken}`)
        const adminHierarchy = await request(app.server)
            .get('/super-admin/market-hierarchy')
            .set('Authorization', `Bearer ${adminToken}`)
        const superHierarchy = await request(app.server)
            .get('/super-admin/market-hierarchy')
            .set('Authorization', `Bearer ${superAdminToken}`)
        const ownerAudit = await request(app.server)
            .get('/admin/audit-logs')
            .set('Authorization', `Bearer ${ownerToken}`)
        const adminAudit = await request(app.server)
            .get('/admin/audit-logs')
            .query({ targetType: 'autocare_moderation_evidence', limit: 10 })
            .set('Authorization', `Bearer ${adminToken}`)
        const superEvidence = await request(app.server)
            .get('/admin/autocare-moderation-evidence')
            .set('Authorization', `Bearer ${superAdminToken}`)

        expect(ownerHierarchy.status).toBe(403)
        expect(adminHierarchy.status).toBe(403)
        expect(superHierarchy.status).toBe(200)
        expect(ownerAudit.status).toBe(403)
        expect(adminAudit.status).toBe(200)
        expect(adminAudit.body).toHaveProperty('items')
        expect(superEvidence.status).toBe(200)
    })

    it('provides an admin-only evidence decision with the related provider context', async () => {
        const ownerToken = createAuthTokens(providerOwner).accessToken
        const adminToken = createAuthTokens(admin).accessToken

        const forbidden = await request(app.server)
            .get('/admin/autocare-moderation-evidence')
            .set('Authorization', `Bearer ${ownerToken}`)
        const list = await request(app.server)
            .get('/admin/autocare-moderation-evidence')
            .query({ status: 'pending' })
            .set('Authorization', `Bearer ${adminToken}`)
        const approvedDocuments = await request(app.server)
            .get('/admin/autocare-moderation-evidence')
            .query({ status: 'approved' })
            .set('Authorization', `Bearer ${adminToken}`)
        const decision = await request(app.server)
            .patch(`/admin/autocare-moderation-evidence/${moderationEvidence.id}/decision`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'approved', reason: 'Public photo matches the service profile and moderation rules.' })

        expect(forbidden.status).toBe(403)
        expect(list.status).toBe(200)
        expect(list.body).toEqual(expect.arrayContaining([
            expect.objectContaining({
                id: moderationEvidence.id,
                provider: expect.objectContaining({ id: provider.id, name: provider.name }),
            }),
        ]))
        expect(approvedDocuments.status).toBe(200)
        expect(approvedDocuments.body).toEqual(expect.arrayContaining([
            expect.objectContaining({
                id: evidence.id,
                kind: 'registration_document',
                reference: 'private://authorization-test-document',
                expiresAt: null,
            }),
        ]))
        expect(decision.status).toBe(200)
        expect(decision.body).toMatchObject({
            id: moderationEvidence.id,
            status: 'approved',
            provider: { id: provider.id, name: provider.name },
        })

        // A moderation decision is durable before the trust refresh runs. The
        // public contract must expose the approved evidence while still
        // omitting its private storage reference and internal notes.
        const trustAfterDecision = await request(app.server)
            .get(`/v1/providers/${provider.id}/trust`)
        expect(trustAfterDecision.status).toBe(200)
        expect(trustAfterDecision.body.evidence).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: moderationEvidence.id, status: 'approved' }),
        ]))
        const approvedEvidence = trustAfterDecision.body.evidence.find(
            (item: { id: string }) => item.id === moderationEvidence.id,
        )
        expect(approvedEvidence).not.toHaveProperty('reference')
        expect(approvedEvidence).not.toHaveProperty('notes')
    })

    it('audits sensitive moderation queue reads without copying private payloads', async () => {
        const adminToken = createAuthTokens(admin).accessToken
        const requests = [
            ['/admin/autocare-appeals', AuditAction.AutoCareAppealsViewed, 'autocare_appeals'],
            ['/admin/autocare-moderation-evidence', AuditAction.AutoCareModerationQueueViewed, 'autocare_moderation_evidence'],
            ['/admin/chat-reports', AuditAction.AutoCareChatReportsViewed, 'autocare_chat_reports'],
            ['/admin/platform-reviews', AuditAction.PlatformReviewsViewed, 'platform_reviews'],
        ] as const

        for (const [path, action, targetType] of requests) {
            const response = await request(app.server)
                .get(path)
                .set('Authorization', `Bearer ${adminToken}`)
            expect(response.status).toBe(200)

            const audit = await AppDataSource.getRepository(AuditLogEntity).findOne({
                where: { actorId: admin.id, action, targetType },
                order: { createdAt: 'DESC' },
            })
            expect(audit).toEqual(expect.objectContaining({ actorId: admin.id, targetType }))
            expect(audit?.metadata).toEqual(expect.objectContaining({ itemCount: expect.any(Number) }))
            expect(audit?.metadata).not.toHaveProperty('reason')
            expect(audit?.metadata).not.toHaveProperty('text')
            expect(audit?.metadata).not.toHaveProperty('phone')
            expect(audit?.metadata).not.toHaveProperty('photoUrls')
        }
    })

    it('completes the appeal lifecycle with a decision, audit event and notification outbox entry', async () => {
        const ownerToken = createAuthTokens(providerOwner).accessToken
        const adminToken = createAuthTokens(admin).accessToken
        const reason = 'The provider profile is complete and the suspension should be reviewed again.'

        const created = await request(app.server)
            .post('/v1/autocare-appeals')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                subject: AutoCareAppealSubject.Provider,
                subjectId: provider.id,
                providerId: provider.id,
                reason,
                evidenceIds: [moderationEvidence.id],
            })
        appealId = created.body.id as string
        const pending = await request(app.server)
            .get('/admin/autocare-appeals')
            .query({ status: 'pending' })
            .set('Authorization', `Bearer ${adminToken}`)
        const decided = await request(app.server)
            .patch(`/admin/autocare-appeals/${appealId}/decision`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'accepted', reason: 'The appeal is accepted after reviewing the submitted evidence.' })
        const mine = await request(app.server)
            .get('/v1/autocare-appeals/my')
            .set('Authorization', `Bearer ${ownerToken}`)

        expect(created.status).toBe(200)
        expect(pending.status).toBe(200)
        expect(pending.body).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: appealId, reason, status: 'pending' }),
        ]))
        expect(decided.status).toBe(200)
        expect(decided.body).toMatchObject({ id: appealId, status: 'accepted', decidedById: admin.id })
        expect(mine.status).toBe(200)
        expect(mine.body).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: appealId, status: 'accepted' }),
        ]))

        const [audit, notification] = await Promise.all([
            AppDataSource.getRepository(AuditLogEntity).findOne({
                where: { targetId: appealId, action: AuditAction.AutoCareAppealDecided },
                order: { createdAt: 'DESC' },
            }),
            AppDataSource.getRepository(OutboxEventEntity).findOneBy({
                idempotencyKey: `notification:autocare-appeal:${appealId}:accepted`,
            }),
        ])
        expect(audit).toEqual(expect.objectContaining({ actorId: admin.id, targetType: 'autocare_appeal' }))
        expect(notification?.payload).toEqual(expect.objectContaining({ userId: providerOwner.id }))
    })

    it('keeps aggregate data-quality queues restricted to administrators', async () => {
        const ownerToken = createAuthTokens(providerOwner).accessToken
        const adminToken = createAuthTokens(admin).accessToken

        const forbidden = await request(app.server)
            .get('/admin/autocare-quality-monitoring')
            .set('Authorization', `Bearer ${ownerToken}`)
        const allowed = await request(app.server)
            .get('/admin/autocare-quality-monitoring')
            .set('Authorization', `Bearer ${adminToken}`)

        expect(forbidden.status).toBe(403)
        expect(allowed.status).toBe(200)
        expect(allowed.body).toMatchObject({
            providers: expect.objectContaining({ total: expect.any(Number) }),
            appeals: expect.objectContaining({ pending: expect.any(Number) }),
        })
    })

    it('allows only super-admins to update incidents and records an immutable audit trail', async () => {
        const adminToken = createAuthTokens(admin).accessToken
        const superAdminToken = createAuthTokens(superAdmin).accessToken

        const forbidden = await request(app.server)
            .patch(`/admin/system-incidents/${incident.id}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: SystemIncidentStatus.Acknowledged })
        const updated = await request(app.server)
            .patch(`/admin/system-incidents/${incident.id}/status`)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({ status: SystemIncidentStatus.Acknowledged })

        expect(forbidden.status).toBe(403)
        expect(updated.status).toBe(200)
        expect(updated.body.status).toBe(SystemIncidentStatus.Acknowledged)

        const audit = await AppDataSource.getRepository(AuditLogEntity).findOne({
            where: {
                targetId: incident.id,
                action: AuditAction.SystemIncidentStatusUpdated,
            },
            order: { createdAt: 'DESC' },
        })
        expect(audit).toEqual(expect.objectContaining({
            actorId: superAdmin.id,
            targetType: 'system_incident',
            metadata: expect.objectContaining({ status: SystemIncidentStatus.Acknowledged }),
        }))
    })
})
