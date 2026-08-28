import { AppDataSource } from '../../database/data-source.js'
import {
    AutomotiveCatalogGapRequestEntity,
    AutomotiveCatalogGapRequestStatus,
    AutomotiveServiceDefinitionEntity,
} from '../../entities/index.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { isAdminRole } from '../../shared/auth/roles.js'
import { hasProviderWorkspacePermission } from './provider-access.service.js'
import type { AutoCareCatalogGapRequestResponse, AutoCareServiceDefinitionResponse, CreateAutoCareCatalogGapRequestInput } from './autocare.types.js'
import type { z } from 'zod'
import type { updateAdminAutoCareServiceDefinitionSchema } from './autocare.schemas.js'

function assertAdmin(user: UserEntity) {
    if (!isAdminRole(user.role)) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only admins can review catalog gap requests.' })
}

function toResponse(request: AutomotiveCatalogGapRequestEntity): AutoCareCatalogGapRequestResponse {
    return {
        id: request.id,
        requestedById: request.requestedById,
        providerId: request.providerId,
        proposedSlug: request.proposedSlug,
        categorySlug: request.categorySlug,
        labels: request.labels,
        priceType: request.priceType as AutoCareCatalogGapRequestResponse['priceType'],
        comparisonAttributes: request.comparisonAttributes,
        rationale: request.rationale,
        status: request.status,
        reviewedById: request.reviewedById,
        reviewReason: request.reviewReason,
        reviewedAt: request.reviewedAt?.toISOString() ?? null,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
    }
}

export type UpdateAdminAutoCareServiceDefinitionInput = z.infer<typeof updateAdminAutoCareServiceDefinitionSchema>

export async function updateAdminAutoCareServiceDefinition(
    admin: UserEntity,
    definitionId: string,
    input: UpdateAdminAutoCareServiceDefinitionInput,
): Promise<AutoCareServiceDefinitionResponse> {
    assertAdmin(admin)
    const repository = AppDataSource.getRepository(AutomotiveServiceDefinitionEntity)
    const definition = await repository.findOneBy({ id: definitionId })
    if (!definition) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service definition not found.' })
    definition.categorySlug = input.categorySlug
    definition.labels = input.labels
    definition.priceType = input.priceType
    definition.comparisonAttributes = [...new Set(input.comparisonAttributes)]
    definition.active = input.active
    return repository.save(definition)
}

export async function createAutoCareCatalogGapRequest(user: UserEntity, input: CreateAutoCareCatalogGapRequestInput) {
    // A provider-specific catalog proposal changes the shared service
    // definition surface. Require the explicit catalog capability instead of
    // accepting any active membership (which would let branch staff submit a
    // provider-wide catalog change). The omitted location keeps this usable
    // for owners and catalog managers assigned to one or more branches.
    if (input.providerId && !(await hasProviderWorkspacePermission(user.id, input.providerId, 'catalog'))) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You cannot submit a catalog request for this provider.' })
    }
    const repository = AppDataSource.getRepository(AutomotiveCatalogGapRequestEntity)
    const existing = await repository.findOneBy({ proposedSlug: input.proposedSlug, status: AutomotiveCatalogGapRequestStatus.Pending })
    if (existing) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'A catalog request for this service is already pending.' })
    return toResponse(await repository.save(repository.create({
        requestedById: user.id,
        providerId: input.providerId ?? null,
        proposedSlug: input.proposedSlug,
        categorySlug: input.categorySlug,
        labels: input.labels,
        priceType: input.priceType,
        comparisonAttributes: [...new Set(input.comparisonAttributes)],
        rationale: input.rationale,
        status: AutomotiveCatalogGapRequestStatus.Pending,
    })))
}

export async function listAdminCatalogGapRequests(admin: UserEntity, status?: AutomotiveCatalogGapRequestStatus) {
    assertAdmin(admin)
    const requests = await AppDataSource.getRepository(AutomotiveCatalogGapRequestEntity).find({ where: status ? { status } : {}, order: { createdAt: 'ASC' } })
    return requests.map(toResponse)
}

export async function decideAdminCatalogGapRequest(admin: UserEntity, requestId: string, status: AutomotiveCatalogGapRequestStatus.Approved | AutomotiveCatalogGapRequestStatus.Rejected, reason?: string | null) {
    assertAdmin(admin)
    if (status === AutomotiveCatalogGapRequestStatus.Rejected && !reason?.trim()) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'A rejection reason is required.' })
    return AppDataSource.transaction(async (manager) => {
        const requestRepository = manager.getRepository(AutomotiveCatalogGapRequestEntity)
        const request = await requestRepository.createQueryBuilder('gapRequest')
            .where('gapRequest.id = :requestId', { requestId })
            .setLock('pessimistic_write')
            .getOne()
        if (!request) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Catalog gap request not found.' })
        if (request.status !== AutomotiveCatalogGapRequestStatus.Pending) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Catalog gap request has already been decided.' })
        if (status === AutomotiveCatalogGapRequestStatus.Approved) {
            const serviceRepository = manager.getRepository(AutomotiveServiceDefinitionEntity)
            if (await serviceRepository.findOneBy({ slug: request.proposedSlug })) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'A service with this slug already exists.' })
            await serviceRepository.save(serviceRepository.create({
                slug: request.proposedSlug,
                categorySlug: request.categorySlug,
                labels: request.labels,
                priceType: request.priceType as never,
                comparisonAttributes: request.comparisonAttributes,
                active: true,
            }))
        }
        request.status = status
        request.reviewedById = admin.id
        request.reviewReason = reason?.trim() || null
        request.reviewedAt = new Date()
        return toResponse(await requestRepository.save(request))
    })
}
