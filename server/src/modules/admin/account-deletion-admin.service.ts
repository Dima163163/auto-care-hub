import { AppDataSource } from '../../database/data-source.js'
import {
    AccountDeletionRequestEntity,
    AccountDeletionRequestStatus,
} from '../../entities/account-deletion-request/account-deletion-request.entity.js'
import { UserEntity } from '../../entities/user/user.entity.js'
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
        const deletionRequest = await repository.findOne({
            where: { id: requestId },
            relations: { user: true },
        })

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

        const now = new Date()
        deletionRequest.status = status
        deletionRequest.cancelledAt = status === AccountDeletionRequestStatus.Cancelled ? now : null
        deletionRequest.completedAt = status === AccountDeletionRequestStatus.Completed ? now : null

        return repository.save(deletionRequest)
    })

    metrics.increment('admin_account_deletion_status_updates_total', 1, { status, outcome })

    return mapAdminDeletionRequest(updatedRequest)
}

export { assertSuperAdminAccess, mapAdminDeletionRequest }
