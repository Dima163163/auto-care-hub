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
import type { AutoCareProviderChangeRequestResponse, CreateAutoCareProviderChangeRequestInput } from './autocare.types.js'

const profileFields = new Set([
    'name', 'description', 'phone', 'phones', 'email', 'websiteUrl', 'metroStation',
    'warrantyText', 'yearsActive', 'staffCount', 'workstationCount', 'amenityIds',
    'brandSpecializations', 'isMultibrand',
])

function assertOwner(user: UserEntity) {
    if (user.role !== 'owner') throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only a service owner can submit provider changes.' })
}

function assertAdmin(user: UserEntity) {
    if (!isAdminRole(user.role)) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only admins can review provider changes.' })
}

function toResponse(request: AutomotiveProviderChangeRequestEntity): AutoCareProviderChangeRequestResponse {
    return {
        id: request.id,
        providerId: request.providerId,
        requestedById: request.requestedById,
        kind: request.kind,
        status: request.status,
        payload: request.payload,
        reviewedById: request.reviewedById,
        reviewReason: request.reviewReason,
        reviewedAt: request.reviewedAt?.toISOString() ?? null,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
    }
}

function normalizeProfilePayload(payload: Record<string, unknown>) {
    const unknownKeys = Object.keys(payload).filter((key) => !profileFields.has(key))
    if (unknownKeys.length > 0) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: `Unsupported provider profile fields: ${unknownKeys.join(', ')}.` })
    const normalized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(payload)) {
        if (['name', 'description', 'phone', 'email', 'websiteUrl', 'metroStation', 'warrantyText'].includes(key)) {
            if (value !== null && typeof value !== 'string') throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: `${key} must be a string or null.` })
            normalized[key] = typeof value === 'string' ? value.trim() : value
            continue
        }
        if (['yearsActive', 'staffCount', 'workstationCount'].includes(key)) {
            if (!Number.isInteger(value) || Number(value) < 0) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: `${key} must be a non-negative integer.` })
            normalized[key] = value
            continue
        }
        if (key === 'isMultibrand') {
            if (typeof value !== 'boolean') throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'isMultibrand must be a boolean.' })
            normalized[key] = value
            continue
        }
        if (['phones', 'amenityIds', 'brandSpecializations'].includes(key)) {
            if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: `${key} must be an array of strings.` })
            normalized[key] = [...new Set(value.map((item) => item.trim()).filter(Boolean))]
        }
    }
    return normalized
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
    const payload = input.kind === AutomotiveProviderChangeRequestKind.ProfileUpdate ? normalizeProfilePayload(input.payload ?? {}) : {}
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
                const changes = normalizeProfilePayload(request.payload)
                for (const [key, value] of Object.entries(changes)) {
                    if (key === 'phones') {
                        provider.phones = value as string[]
                        provider.phone = provider.phones[0] ?? null
                    } else if (key in provider) {
                        Object.assign(provider, { [key]: value })
                    }
                }
            }
            await providerRepository.save(provider)
        }
        request.status = status
        request.reviewedById = admin.id
        request.reviewReason = reason?.trim() || null
        request.reviewedAt = new Date()
        return toResponse(await requestRepository.save(request))
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
