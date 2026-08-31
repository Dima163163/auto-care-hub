import { AppDataSource } from '../../database/data-source.js'
import {
    AutomotiveProviderChangeRequestEntity,
    AutomotiveProviderChangeRequestKind,
    AutomotiveProviderChangeRequestStatus,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveServiceLocationEntity,
} from '../../entities/index.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { isAdminRole, isSuperAdmin } from '../../shared/auth/roles.js'
import { canManageProvider } from './provider-access.service.js'
import { queueProviderDocumentModerationEvidence } from './moderation-evidence.service.js'
import { enqueueNotificationSafely } from '../outbox/notification-outbox.service.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import type { AutoCareProviderChangeRequestResponse, CreateAutoCareProviderChangeRequestInput } from './autocare.types.js'
import { normalizePrivateReference } from './private-reference-policy.js'
import { normalizeProviderProfileChangePayload } from './provider-change-request-policy.js'

function assertOwner(user: UserEntity) {
    if (user.role !== 'owner') throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only a service owner can submit provider changes.' })
}

function assertAdmin(user: UserEntity) {
    if (!isAdminRole(user.role)) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only admins can review provider changes.' })
}

function toResponse(request: AutomotiveProviderChangeRequestEntity): AutoCareProviderChangeRequestResponse {
    const payload = { ...request.payload }
    if (Array.isArray(payload.documents)) {
        payload.documents = payload.documents.flatMap((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return []
            const document = item as { label?: unknown; reference?: unknown; expiresAt?: unknown }
            const reference = typeof document.reference === 'string' ? normalizePrivateReference(document.reference) : null
            return reference && typeof document.label === 'string'
                ? [{ label: document.label, reference, expiresAt: document.expiresAt ?? null }]
                : []
        })
    }
    return {
        id: request.id,
        providerId: request.providerId,
        requestedById: request.requestedById,
        kind: request.kind,
        status: request.status,
        payload,
        reviewedById: request.reviewedById,
        reviewReason: request.reviewReason,
        reviewedAt: request.reviewedAt?.toISOString() ?? null,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
    }
}

async function getOwnedProvider(user: UserEntity, providerId: string) {
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: providerId })
    if (!provider) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service provider not found.' })
    if (provider.ownerId !== user.id || !(await canManageProvider(user.id, providerId))) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not own this automotive service provider.' })
    return provider
}

export async function listOwnerProviderChangeRequests(user: UserEntity, providerId: string) {
    await getOwnedProvider(user, providerId)
    const requests = await AppDataSource.getRepository(AutomotiveProviderChangeRequestEntity).find({ where: { providerId }, order: { createdAt: 'DESC' } })
    return requests.map(toResponse)
}

export async function createOwnerProviderChangeRequest(user: UserEntity, providerId: string, input: CreateAutoCareProviderChangeRequestInput) {
    assertOwner(user)
    await getOwnedProvider(user, providerId)
    const repository = AppDataSource.getRepository(AutomotiveProviderChangeRequestEntity)
    const existing = await repository.findOneBy({ providerId, kind: input.kind, status: AutomotiveProviderChangeRequestStatus.Pending })
    if (existing) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'A provider change request of this type is already pending.' })
    const payload = input.kind === AutomotiveProviderChangeRequestKind.ProfileUpdate ? normalizeProviderProfileChangePayload(input.payload ?? {}) : {}
    return toResponse(await repository.save(repository.create({ providerId, requestedById: user.id, kind: input.kind, status: AutomotiveProviderChangeRequestStatus.Pending, payload })))
}

export async function listAdminProviderChangeRequests(admin: UserEntity, status?: AutomotiveProviderChangeRequestStatus, kind?: AutomotiveProviderChangeRequestKind) {
    assertAdmin(admin)
    const requests = await AppDataSource.getRepository(AutomotiveProviderChangeRequestEntity).find({
        where: { ...(status ? { status } : {}), ...(kind ? { kind } : {}) },
        order: { createdAt: 'ASC' },
    })
    return requests.map(toResponse)
}

export async function decideAdminProviderChangeRequest(admin: UserEntity, requestId: string, status: AutomotiveProviderChangeRequestStatus.Approved | AutomotiveProviderChangeRequestStatus.Rejected, reason?: string | null) {
    assertAdmin(admin)
    return AppDataSource.transaction(async (manager) => {
        const requestRepository = manager.getRepository(AutomotiveProviderChangeRequestEntity)
        const request = await requestRepository.createQueryBuilder('changeRequest')
            .where('changeRequest.id = :requestId', { requestId })
            .setLock('pessimistic_write')
            .getOne()
        if (!request) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Provider change request not found.' })
        if (request.status !== AutomotiveProviderChangeRequestStatus.Pending) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Provider change request has already been decided.' })
        const providerRepository = manager.getRepository(AutomotiveProviderEntity)
        const provider = await providerRepository.findOneBy({ id: request.providerId })
        if (!provider) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service provider not found.' })
        if (status === AutomotiveProviderChangeRequestStatus.Approved) {
            if (request.kind === AutomotiveProviderChangeRequestKind.Verification) {
                provider.verified = true
                if (provider.status === AutomotiveProviderStatus.Draft) provider.status = AutomotiveProviderStatus.Active
            } else {
                const changes = normalizeProviderProfileChangePayload(request.payload)
                const documents = Array.isArray(changes.documents) ? changes.documents as Array<{ label: string; reference: string; expiresAt: string | null }> : []
                for (const [key, value] of Object.entries(changes)) {
                    if (key === 'documents') continue
                    if (key === 'phones') {
                        provider.phones = value as string[]
                        provider.phone = provider.phones[0] ?? null
                    } else if (key in provider) {
                        Object.assign(provider, { [key]: value })
                    }
                }
                if (documents.length > 0) {
                    await queueProviderDocumentModerationEvidence(manager, provider.id, documents.map((document) => ({
                        ...document,
                        expiresAt: document.expiresAt ? new Date(document.expiresAt) : null,
                    })))
                }
            }
            await providerRepository.save(provider)
        }
        request.status = status
        request.reviewedById = admin.id
        request.reviewReason = reason?.trim() || null
        request.reviewedAt = new Date()
        const savedRequest = await requestRepository.save(request)
        await enqueueNotificationSafely({
            userId: savedRequest.requestedById,
            category: NotificationCategory.Account,
            title: status === AutomotiveProviderChangeRequestStatus.Approved ? 'Изменение профиля одобрено' : 'По изменению профиля нужны уточнения',
            message: savedRequest.reviewReason || (status === AutomotiveProviderChangeRequestStatus.Approved
                ? 'Модератор одобрил заявку на изменение данных сервиса.'
                : 'Модератор оставил комментарий к заявке на изменение данных сервиса.'),
            link: `/owner/autocare-providers/${savedRequest.providerId}`,
            metadata: { providerId: savedRequest.providerId, changeRequestId: savedRequest.id, status },
        }, `autocare-provider-change-request:${savedRequest.id}:${status}`, manager)
        return toResponse(savedRequest)
    })
}

export async function cancelOwnerProviderChangeRequest(user: UserEntity, providerId: string, requestId: string) {
    assertOwner(user)
    await getOwnedProvider(user, providerId)
    const repository = AppDataSource.getRepository(AutomotiveProviderChangeRequestEntity)
    const request = await repository.findOneBy({ id: requestId, providerId })
    if (!request) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Provider change request not found.' })
    if (request.status !== AutomotiveProviderChangeRequestStatus.Pending) return toResponse(request)
    request.status = AutomotiveProviderChangeRequestStatus.Cancelled
    return toResponse(await repository.save(request))
}

export function isSuperAdminActor(user: UserEntity) {
    return isSuperAdmin(user)
}

export async function getProviderChangeRequestLocation(providerId: string) {
    return AppDataSource.getRepository(AutomotiveServiceLocationEntity).findOneBy({ providerId })
}
