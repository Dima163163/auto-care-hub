import { type EntityManager } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import {
    AccountDeletionRequestEntity,
    AccountDeletionRequestStatus,
} from '../../entities/account-deletion-request/account-deletion-request.entity.js'
import { UserEntity, UserStatus } from '../../entities/user/user.entity.js'
import { UserSessionEntity } from '../../entities/user-session/user-session.entity.js'
import { SecurityTokenEntity } from '../../entities/security-token/security-token.entity.js'
import { OAuthIdentityEntity } from '../../entities/oauth-identity/oauth-identity.entity.js'
import { OAuthLinkRequestEntity } from '../../entities/oauth-link-request/oauth-link-request.entity.js'
import { FavoriteCabinetEntity } from '../../entities/favorite-cabinet/favorite-cabinet.entity.js'
import { CabinetEntity, CabinetStatus } from '../../entities/cabinet/cabinet.entity.js'
import { NotificationEntity } from '../../entities/notification/notification.entity.js'
import { ClientVehicleEntity } from '../../entities/user/client-vehicle.entity.js'
import {
    AutoCareBonusAccountEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderInvitationEntity,
    AutomotiveProviderMembershipEntity,
    AutomotiveProviderStatus,
} from '../../entities/index.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { isSuperAdmin } from '../../shared/auth/roles.js'
import {
    assertCursorDate,
    decodeCursor,
    getCursorLimit,
    isCursorPaginationRequested,
    toCursorPage,
} from '../../shared/http/cursor-pagination.js'
import type { CursorPage } from '../../shared/http/cursor-pagination.js'
import { isAccountDeletionStatusTransitionAllowed } from './account-deletion-status.js'
import { metrics } from '../../shared/observability/metrics.js'
import { getAdminDeletionListLimit } from './account-deletion-list-policy.js'
import { getAnonymizedIdentity, ANONYMIZED_REVIEW_TEXT } from '../users/account-anonymization-policy.js'
import { isAccountDeletionReady } from '../users/account-deletion-retention.js'
import { removeAutoCareAttachmentObject } from '../autocare/autocare-attachment-storage.js'
import { getAutoCareProviderLogoFileName, removeAutoCareProviderLogo } from '../autocare/autocare-provider-logo-storage.js'
import { getAutoCareProviderMediaFileName, removeAutoCareProviderMedia } from '../autocare/autocare-provider-media-storage.js'
import { deleteUploadedCabinetImages } from '../cabinets/cabinet-image-storage.js'
import { assertAutoCareDeletionInvariants } from '../users/account-deletion-invariants.js'

async function anonymizeAccount(manager: EntityManager, userId: string) {
    const userRepository = manager.getRepository(UserEntity)
    const user = await userRepository.findOneBy({ id: userId })
    if (!user) return null

    const originalEmail = user.email
    const attachments = await manager.query(
        `SELECT "objectKey"
           FROM "autocare_service_attachments"
          WHERE "uploadedById" = $1
             OR "requestId" IN (SELECT "id" FROM "autocare_service_requests" WHERE "clientId" = $1)
             OR "threadId" IN (SELECT "id" FROM "autocare_chat_threads" WHERE "clientId" = $1 OR "createdById" = $1)`,
        [userId],
    ) as Array<{ objectKey: string }>
    // Privacy wins over availability here. If object deletion fails, the
    // transaction is rolled back and completion can safely be retried because
    // object deletion is idempotent.
    for (const attachment of attachments) {
        await removeAutoCareAttachmentObject(attachment.objectKey)
    }

    const ownedProviders = await manager.getRepository(AutomotiveProviderEntity).find({
        where: { ownerId: userId },
        select: { logoUrl: true, coverImageUrl: true, galleryImageUrls: true },
    })
    // Provider media is public by URL, so it must be removed before the
    // account is anonymized. If storage deletion fails, the transaction rolls
    // back and the provider keeps its references for a safe retry.
    for (const provider of ownedProviders) {
        const logoFileName = provider.logoUrl ? getAutoCareProviderLogoFileName(provider.logoUrl) : null
        if (logoFileName) await removeAutoCareProviderLogo(logoFileName)
        const coverFileName = provider.coverImageUrl
            ? getAutoCareProviderMediaFileName(provider.coverImageUrl, 'cover')
            : null
        if (coverFileName) await removeAutoCareProviderMedia('cover', coverFileName)
        for (const galleryUrl of provider.galleryImageUrls ?? []) {
            const galleryFileName = getAutoCareProviderMediaFileName(galleryUrl, 'gallery')
            if (galleryFileName) await removeAutoCareProviderMedia('gallery', galleryFileName)
        }
    }

    const ownedCabinets = await manager.getRepository(CabinetEntity).find({
        where: { ownerId: userId },
        select: { id: true, photos: true },
    })
    // Legacy cabinets remain referenced by historical bookings, so they
    // cannot be removed safely. Make them non-public and delete their
    // uploaded image objects before the account is anonymized instead.
    for (const cabinet of ownedCabinets) {
        if (cabinet.photos.length > 0) await deleteUploadedCabinetImages(cabinet.photos)
    }
    await manager.getRepository(CabinetEntity).update(
        { ownerId: userId },
        { status: CabinetStatus.Blocked, photos: [] },
    )

    const identity = getAnonymizedIdentity(userId)
    user.name = identity.name
    user.email = identity.email
    user.status = UserStatus.Blocked
    user.passwordHash = null
    user.phone = null
    user.avatarUrl = null
    user.locale = null
    user.emailVerifiedAt = null
    user.emailNotifications = false
    user.bookingEmailNotifications = false
    user.preferredCity = null
    user.preferredCategories = []
    user.failedLoginAttempts = 0
    user.lockedUntil = null
    user.lastFailedLoginAt = null
    user.tokenVersion += 1
    await userRepository.save(user)

    await manager.getRepository(UserSessionEntity).delete({ userId })
    await manager.getRepository(SecurityTokenEntity).delete({ userId })
    await manager.getRepository(OAuthLinkRequestEntity).delete({ userId })
    await manager.getRepository(OAuthIdentityEntity).delete({ userId })
    await manager.getRepository(FavoriteCabinetEntity).delete({ userId })
    await manager.getRepository(NotificationEntity).delete({ userId })
    await manager.getRepository(ClientVehicleEntity).delete({ userId })
    await manager.query(
        `DELETE FROM "autocare_service_attachments"
          WHERE "uploadedById" = $1
             OR "requestId" IN (SELECT "id" FROM "autocare_service_requests" WHERE "clientId" = $1)
             OR "threadId" IN (SELECT "id" FROM "autocare_chat_threads" WHERE "clientId" = $1 OR "createdById" = $1)`,
        [userId],
    )
    await manager.getRepository(AutoCareBonusAccountEntity).delete({ clientId: userId })
    await manager.getRepository(AutomotiveProviderMembershipEntity).delete({ userId })
    await manager.getRepository(AutomotiveProviderInvitationEntity).delete([
        { email: originalEmail },
        { invitedById: userId },
    ])
    // A detached provider is suspended and no longer public. Clear direct
    // contact fields that may have been the owner's personal phone/email while
    // preserving the business profile for an explicit future transfer.
    await manager.getRepository(AutomotiveProviderEntity).update(
        { ownerId: userId },
        {
            phone: null,
            phones: [],
            email: null,
            publicContactNote: null,
            logoUrl: null,
            coverImageUrl: null,
            galleryImageUrls: [],
        },
    )
    await manager.getRepository(AutomotiveProviderEntity).update(
        { ownerId: userId },
        { ownerId: null, status: AutomotiveProviderStatus.Suspended },
    )

    // Preserve immutable booking/financial references, but redact free text and
    // private AutoCare payloads that are not needed for settlement/audit.
    await manager.query('UPDATE "reviews" SET "text" = $1 WHERE "clientId" = $2', [ANONYMIZED_REVIEW_TEXT, userId])
    await manager.query('UPDATE "audit_logs" SET "actor_id" = NULL, "metadata" = \'{"redacted": true}\'::jsonb WHERE "actor_id" = $1', [userId])
    await manager.query('UPDATE "platform_reviews" SET "authorName" = $1, "avatarUrl" = NULL, "text" = $2, "organizationResponse" = NULL WHERE "clientId" = $3', [identity.name, ANONYMIZED_REVIEW_TEXT, userId])
    await manager.query('UPDATE "platform_reviews" SET "respondedById" = NULL WHERE "respondedById" = $1', [userId])
    await manager.query('UPDATE "autocare_reviews" SET "authorName" = $1, "vehicleLabel" = $1, "avatarUrl" = NULL, "photoUrls" = \'{}\', "text" = $2, "clientId" = NULL WHERE "clientId" = $3', [identity.name, ANONYMIZED_REVIEW_TEXT, userId])
    await manager.query('UPDATE "autocare_review_promos" SET "clientId" = NULL, "redeemedById" = NULL WHERE "clientId" = $1 OR "redeemedById" = $1', [userId])
    await manager.query(
        `UPDATE "autocare_service_requests"
            SET "contactSnapshot" = NULL,
                "vehicleSnapshot" = NULL,
                "note" = NULL,
                "cancelledById" = NULL,
                "noShowById" = NULL,
                "completedById" = NULL
          WHERE "clientId" = $1
             OR "cancelledById" = $1
             OR "noShowById" = $1
             OR "completedById" = $1`,
        [userId],
    )
    await manager.query('UPDATE "autocare_service_quotes" SET "snapshot" = jsonb_build_object(\'redacted\', true) WHERE "requestId" IN (SELECT "id" FROM "autocare_service_requests" WHERE "clientId" = $1)', [userId])
    await manager.query('UPDATE "autocare_broadcast_requests" SET "issueDescription" = $1, "vehicleSnapshot" = NULL, "photoUrls" = \'{}\' WHERE "clientId" = $2', [ANONYMIZED_REVIEW_TEXT, userId])
    await manager.query('UPDATE "autocare_guarantee_claims" SET "summary" = $1, "evidenceUrls" = \'{}\', "resolution" = NULL WHERE "clientId" = $2', [ANONYMIZED_REVIEW_TEXT, userId])
    await manager.query('UPDATE "autocare_guarantee_claims" SET "resolvedById" = NULL WHERE "resolvedById" = $1', [userId])
    await manager.query('UPDATE "autocare_expert_questions" SET "symptoms" = $1, "vehicleSnapshot" = NULL, "answer" = NULL WHERE "clientId" = $2', [ANONYMIZED_REVIEW_TEXT, userId])
    await manager.query('UPDATE "autocare_expert_questions" SET "answeredById" = NULL WHERE "answeredById" = $1', [userId])
    await manager.query('UPDATE "autocare_fleet_accounts" SET "notes" = NULL WHERE "ownerId" = $1', [userId])
    await manager.query('UPDATE "autocare_fleet_vehicles" SET "label" = $1, "vehicleSnapshot" = \'{}\', "approvalPolicy" = NULL WHERE "fleetId" IN (SELECT "id" FROM "autocare_fleet_accounts" WHERE "ownerId" = $2)', [identity.name, userId])
    await manager.query('UPDATE "autocare_service_requests" SET "cancellationReason" = NULL, "noShowReason" = NULL, "completionNote" = NULL WHERE "clientId" = $1', [userId])
    await manager.query(
        `UPDATE "autocare_service_messages"
            SET "body" = NULL, "offer" = NULL
          WHERE "senderId" = $1
             OR "requestId" IN (SELECT "id" FROM "autocare_service_requests" WHERE "clientId" = $1)
             OR "threadId" IN (SELECT "id" FROM "autocare_chat_threads" WHERE "clientId" = $1 OR "createdById" = $1)`,
        [userId],
    )
    await manager.query('UPDATE "autocare_chat_reports" SET "description" = NULL, "reportedUserId" = NULL, "reviewedById" = NULL, "resolutionReason" = NULL WHERE "reporterId" = $1 OR "reportedUserId" = $1 OR "reviewedById" = $1 OR "threadId" IN (SELECT "id" FROM "autocare_chat_threads" WHERE "clientId" = $1 OR "createdById" = $1)', [userId])
    await manager.query('UPDATE "autocare_chat_blocks" SET "reason" = NULL WHERE "blockerId" = $1 OR "blockedUserId" = $1 OR "threadId" IN (SELECT "id" FROM "autocare_chat_threads" WHERE "clientId" = $1 OR "createdById" = $1)', [userId])
    await manager.query('UPDATE "autocare_chat_threads" SET "subject" = $2, "clientId" = NULL, "createdById" = NULL WHERE "clientId" = $1 OR "createdById" = $1', [userId, ANONYMIZED_REVIEW_TEXT])
    await manager.query(
        `UPDATE "autocare_repair_events"
            SET "actorId" = NULL, "title" = $2, "notes" = NULL, "metadata" = '{}'::jsonb
          WHERE "actorId" = $1
             OR "requestId" IN (SELECT "id" FROM "autocare_service_requests" WHERE "clientId" = $1)`,
        [userId, ANONYMIZED_REVIEW_TEXT],
    )
    await manager.query('UPDATE "autocare_trust_evidence" SET "verifiedById" = NULL WHERE "verifiedById" = $1', [userId])
    await manager.query('UPDATE "autocare_provider_change_requests" SET "payload" = \'{"redacted": true}\'::jsonb, "reviewedById" = NULL, "reviewReason" = NULL WHERE "requestedById" = $1', [userId])
    await manager.query('UPDATE "autocare_provider_change_requests" SET "reviewedById" = NULL, "reviewReason" = NULL WHERE "reviewedById" = $1', [userId])
    await manager.query('UPDATE "autocare_catalog_gap_requests" SET "labels" = \'{}\'::jsonb, "comparisonAttributes" = \'[]\'::jsonb, "rationale" = $1, "reviewedById" = NULL, "reviewReason" = NULL WHERE "requestedById" = $2', [ANONYMIZED_REVIEW_TEXT, userId])
    await manager.query('UPDATE "autocare_catalog_gap_requests" SET "reviewedById" = NULL, "reviewReason" = NULL WHERE "reviewedById" = $1', [userId])
    await manager.query('UPDATE "autocare_appeals" SET "reason" = $1, "evidenceIds" = \'{}\', "decidedById" = NULL, "decisionReason" = NULL WHERE "submittedById" = $2', [ANONYMIZED_REVIEW_TEXT, userId])
    await manager.query('UPDATE "autocare_appeals" SET "decidedById" = NULL, "decisionReason" = NULL WHERE "decidedById" = $1', [userId])
    await manager.query(
        `UPDATE "autocare_reschedule_requests"
            SET "reason" = NULL, "resolvedById" = NULL, "resolutionReason" = NULL
          WHERE "requestedById" = $1
             OR "resolvedById" = $1
             OR "requestId" IN (SELECT "id" FROM "autocare_service_requests" WHERE "clientId" = $1)`,
        [userId],
    )
    await manager.query('UPDATE "booking_reschedule_requests" SET "resolvedById" = NULL, "resolutionReason" = NULL WHERE "requestedById" = $1 OR "resolvedById" = $1 OR "bookingId" IN (SELECT "id" FROM "bookings" WHERE "clientId" = $1)', [userId])
    await manager.query('UPDATE "booking_status_history" SET "changedById" = NULL, "reason" = NULL WHERE "changedById" = $1 OR "bookingId" IN (SELECT "id" FROM "bookings" WHERE "clientId" = $1)', [userId])
    await manager.query('UPDATE "bookings" SET "comment" = NULL, "cancellationReason" = NULL, "ownerNote" = NULL WHERE "clientId" = $1', [userId])
    await manager.query('UPDATE "autocare_trust_policy" SET "updatedById" = NULL WHERE "updatedById" = $1', [userId])
    await manager.query('UPDATE "autocare_bonus_ledger" SET "actorId" = NULL WHERE "actorId" = $1', [userId])
    await manager.query('UPDATE "security_event_actions" SET "assignee_id" = NULL WHERE "assignee_id" = $1', [userId])
    await manager.query('UPDATE "security_events" SET "user_id" = NULL WHERE "user_id" = $1', [userId])
    await assertAutoCareDeletionInvariants(manager, userId)
    return user
}

export type AdminDeletionRequestsQuery = {
    status?: AccountDeletionRequestStatus
    cursor?: string
    limit?: number
}

export type AdminDeletionRequest = {
    id: string
    userId: string
    user: {
        id: string
        name: string
        email: string
    }
    status: AccountDeletionRequestStatus
    reason: string | null
    requestedAt: string
    cancelledAt: string | null
    completedAt: string | null
}

export type AdminDeletionRequestTerminalStatus =
    | AccountDeletionRequestStatus.Cancelled
    | AccountDeletionRequestStatus.Completed

function assertSuperAdminAccess(user: UserEntity) {
    if (!isSuperAdmin(user)) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only super admin can manage account deletion requests.',
        })
    }
}

function mapAdminDeletionRequest(request: AccountDeletionRequestEntity): AdminDeletionRequest {
    return {
        id: request.id,
        userId: request.userId,
        user: {
            id: request.user.id,
            name: request.user.name,
            email: request.user.email,
        },
        status: request.status,
        reason: request.reason,
        requestedAt: request.requestedAt.toISOString(),
        cancelledAt: request.cancelledAt?.toISOString() ?? null,
        completedAt: request.completedAt?.toISOString() ?? null,
    }
}

export async function getAdminDeletionRequests(
    admin: UserEntity,
    input: AdminDeletionRequestsQuery = {},
): Promise<AdminDeletionRequest[] | CursorPage<AdminDeletionRequest>> {
    assertSuperAdminAccess(admin)

    const isPaginated = isCursorPaginationRequested(input)
    const limit = getCursorLimit(input.limit)
    const query = AppDataSource.getRepository(AccountDeletionRequestEntity)
        .createQueryBuilder('request')
        .leftJoinAndSelect('request.user', 'user')

    if (input.status) {
        query.andWhere('request.status = :status', { status: input.status })
    }

    if (input.cursor) {
        const cursor = decodeCursor(input.cursor, ['requestedAt', 'id'])
        const requestedAt = assertCursorDate(cursor, 'requestedAt')
        query.andWhere(
            '(request.requestedAt < :requestedAt OR (request.requestedAt = :requestedAt AND request.id < :cursorId))',
            { requestedAt, cursorId: cursor.id },
        )
    }

    const requests = await query
        .orderBy('request.requestedAt', 'DESC')
        .addOrderBy('request.id', 'DESC')
        .take(isPaginated ? limit + 1 : getAdminDeletionListLimit())
        .getMany()
    const mappedRequests = requests.map(mapAdminDeletionRequest)

    return isPaginated
        ? toCursorPage(mappedRequests, limit, (request) => ({
            requestedAt: request.requestedAt,
            id: request.id,
        }))
        : mappedRequests
}

export async function updateAdminDeletionRequestStatus(
    admin: UserEntity,
    requestId: string,
    status: AdminDeletionRequestTerminalStatus,
): Promise<AdminDeletionRequest> {
    assertSuperAdminAccess(admin)
    let outcome: 'updated' | 'reused' = 'updated'

    const updatedRequest = await AppDataSource.transaction(async (manager) => {
        const repository = manager.getRepository(AccountDeletionRequestEntity)
        const deletionRequest = await repository
            .createQueryBuilder('request')
            .where('request.id = :requestId', { requestId })
            .setLock('pessimistic_write')
            .getOne()

        if (!deletionRequest) {
            throw new AppError({
                statusCode: 404,
                code: ERROR_CODES.NotFound,
                message: 'Account deletion request not found.',
            })
        }

        const requestUser = await manager.getRepository(UserEntity).findOneBy({ id: deletionRequest.userId })
        if (!requestUser) {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.Conflict,
                message: 'Account deletion request has no active account.',
            })
        }
        deletionRequest.user = requestUser

        if (deletionRequest.status === status) {
            outcome = 'reused'
            return deletionRequest
        }

        if (!isAccountDeletionStatusTransitionAllowed(deletionRequest.status, status)) {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.Conflict,
                message: 'Only pending account deletion requests can change status.',
            })
        }

        if (status === AccountDeletionRequestStatus.Completed && !isAccountDeletionReady(deletionRequest.requestedAt)) {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.Conflict,
                message: 'Account deletion retention period has not elapsed.',
            })
        }

        const now = new Date()
        if (status === AccountDeletionRequestStatus.Completed) {
            const anonymizedUser = await anonymizeAccount(manager, deletionRequest.userId)
            if (anonymizedUser) deletionRequest.user = anonymizedUser
        }
        deletionRequest.status = status
        deletionRequest.cancelledAt = status === AccountDeletionRequestStatus.Cancelled ? now : null
        deletionRequest.completedAt = status === AccountDeletionRequestStatus.Completed ? now : null

        return repository.save(deletionRequest)
    })

    metrics.increment('admin_account_deletion_status_updates_total', 1, { status, outcome })

    return mapAdminDeletionRequest(updatedRequest)
}

export { assertSuperAdminAccess, mapAdminDeletionRequest }
