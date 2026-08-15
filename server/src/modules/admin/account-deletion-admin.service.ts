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
import { NotificationEntity } from '../../entities/notification/notification.entity.js'
import { ClientVehicleEntity } from '../../entities/user/client-vehicle.entity.js'
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

async function anonymizeAccount(manager: EntityManager, userId: string) {
    const userRepository = manager.getRepository(UserEntity)
    const user = await userRepository.findOneBy({ id: userId })
    if (!user) return null

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

    // Preserve immutable booking/financial references, but redact free text and
    // private AutoCare payloads that are not needed for settlement/audit.
    await manager.query('UPDATE "reviews" SET "text" = $1 WHERE "clientId" = $2', [ANONYMIZED_REVIEW_TEXT, userId])
    await manager.query('UPDATE "audit_logs" SET "actor_id" = NULL WHERE "actor_id" = $1', [userId])
    await manager.query('UPDATE "platform_reviews" SET "authorName" = $1, "avatarUrl" = NULL, "text" = $2, "organizationResponse" = NULL WHERE "clientId" = $3', [identity.name, ANONYMIZED_REVIEW_TEXT, userId])
    await manager.query('UPDATE "autocare_reviews" SET "authorName" = $1, "vehicleLabel" = $1, "avatarUrl" = NULL, "photoUrls" = \'{}\', "text" = $2, "clientId" = NULL WHERE "clientId" = $3', [identity.name, ANONYMIZED_REVIEW_TEXT, userId])
    await manager.query('UPDATE "autocare_review_promos" SET "clientId" = NULL, "redeemedById" = NULL WHERE "clientId" = $1 OR "redeemedById" = $1', [userId])
    await manager.query('UPDATE "autocare_service_requests" SET "contactSnapshot" = NULL, "vehicleSnapshot" = NULL, "note" = NULL WHERE "clientId" = $1', [userId])
    await manager.query('UPDATE "autocare_service_quotes" SET "snapshot" = jsonb_build_object(\'redacted\', true) WHERE "requestId" IN (SELECT "id" FROM "autocare_service_requests" WHERE "clientId" = $1)', [userId])
    await manager.query('UPDATE "autocare_broadcast_requests" SET "issueDescription" = $1, "vehicleSnapshot" = NULL, "photoUrls" = \'{}\' WHERE "clientId" = $2', [ANONYMIZED_REVIEW_TEXT, userId])
    await manager.query('UPDATE "autocare_guarantee_claims" SET "summary" = $1, "evidenceUrls" = \'{}\', "resolution" = NULL WHERE "clientId" = $2', [ANONYMIZED_REVIEW_TEXT, userId])
    await manager.query('UPDATE "autocare_expert_questions" SET "symptoms" = $1, "vehicleSnapshot" = NULL, "answer" = NULL WHERE "clientId" = $2', [ANONYMIZED_REVIEW_TEXT, userId])
    await manager.query('UPDATE "autocare_fleet_accounts" SET "notes" = NULL WHERE "ownerId" = $1', [userId])
    await manager.query('UPDATE "autocare_fleet_vehicles" SET "label" = $1, "vehicleSnapshot" = \'{}\', "approvalPolicy" = NULL WHERE "fleetId" IN (SELECT "id" FROM "autocare_fleet_accounts" WHERE "ownerId" = $2)', [identity.name, userId])
    await manager.query('UPDATE "autocare_chat_threads" SET "clientId" = NULL, "createdById" = NULL WHERE "clientId" = $1 OR "createdById" = $1', [userId])
    await manager.query('UPDATE "autocare_service_messages" SET "body" = NULL WHERE "senderId" = $1', [userId])
    await manager.query('DELETE FROM "autocare_service_attachments" WHERE "uploadedById" = $1', [userId])
    await manager.query('UPDATE "autocare_repair_events" SET "actorId" = NULL, "notes" = NULL, "metadata" = \'{}\' WHERE "actorId" = $1', [userId])
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
            .leftJoinAndSelect('request.user', 'user')
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
