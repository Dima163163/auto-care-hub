import { In } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveProviderEntity, AutomotiveServiceDefinitionEntity, AutomotiveServiceLocationEntity, AutomotiveServiceOfferingEntity, AutoCareServiceQuoteEntity, AutoCareRescheduleRequestEntity, AutoCareRescheduleStatus, ServiceRequestEntity } from '../../entities/index.js'
import { type UserEntity } from '../../entities/user/user.entity.js'
import type { AutoCareQuoteLineItemResponse } from './autocare.types.js'
import { getManagedProviderPermissionScopes, isManagedProviderLocationAllowed } from './provider-access.service.js'
import { getAutoCareQuoteLifecycleStatus } from './quote-policy.js'
import { assertParticipant, getRequest, requireSuperAdminRequestAccessReason } from './request-access.service.js'
import { clientOnly, notFound, requireAutoCareRequestUuid } from './request-errors.js'
import { requestResponse, rescheduleResponse } from './request-response.js'

export async function hydrateRequest(request: ServiceRequestEntity) {
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
    const location = await AppDataSource.getRepository(AutomotiveServiceLocationEntity).findOneBy({ id: request.locationId })
    const definition = await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).findOneBy({ id: request.definitionId })
    const offering = request.offeringId
        ? await AppDataSource.getRepository(AutomotiveServiceOfferingEntity).findOneBy({ id: request.offeringId })
        : null
    const quoteHistory = await AppDataSource.getRepository(AutoCareServiceQuoteEntity).find({
        where: { requestId: request.id },
        order: { version: 'ASC' },
        take: 50,
    })
    const pendingReschedule = await AppDataSource.getRepository(AutoCareRescheduleRequestEntity).findOne({
        where: { requestId: request.id, status: AutoCareRescheduleStatus.Pending },
        order: { createdAt: 'DESC' },
    })
    if (!provider || !location || !definition) notFound('Service request references missing service data.')
    return requestResponse(request, provider, location, definition, offering, quoteHistory.map((quote) => ({
        id: quote.id,
        version: quote.version,
        amountMinor: quote.amountMinor,
        lineItems: Array.isArray(quote.snapshot.lineItems) ? quote.snapshot.lineItems as AutoCareQuoteLineItemResponse[] : [],
        subtotalMinor: typeof quote.snapshot.subtotalMinor === 'number' ? quote.snapshot.subtotalMinor : quote.amountMinor,
        taxMinor: typeof quote.snapshot.taxMinor === 'number' ? quote.snapshot.taxMinor : 0,
        feesMinor: typeof quote.snapshot.feesMinor === 'number' ? quote.snapshot.feesMinor : 0,
        currencyCode: quote.currencyCode,
        note: typeof quote.snapshot.note === 'string' ? quote.snapshot.note : null,
        validUntil: quote.validUntil?.toISOString() ?? null,
        priceLocked: quote.snapshot.priceLocked === true,
        status: getAutoCareQuoteLifecycleStatus(quote.status, quote.validUntil),
        createdAt: quote.createdAt.toISOString(),
    })), pendingReschedule ? rescheduleResponse(pendingReschedule) : null)
}

export async function getMyAutoCareServiceRequests(user: UserEntity) {
    clientOnly(user)
    const requests = await AppDataSource.getRepository(ServiceRequestEntity).find({ where: { clientId: user.id }, order: { createdAt: 'DESC' } })
    return Promise.all(requests.map(hydrateRequest))
}

export async function getOwnerAutoCareServiceRequests(user: UserEntity) {
    const scopes = await getManagedProviderPermissionScopes(user.id, 'requests')
    const providerIds = scopes.map(({ providerId }) => providerId)
    const providers = providerIds.length === 0
        ? []
        : await AppDataSource.getRepository(AutomotiveProviderEntity).find({ where: { id: In(providerIds) } })
    if (providers.length === 0) return []
    const requests = await AppDataSource.getRepository(ServiceRequestEntity).find({ where: { providerId: In(providers.map((provider) => provider.id)) }, order: { createdAt: 'DESC' } })
    const visibleRequests = requests.filter((request) => isManagedProviderLocationAllowed(scopes, request.providerId, request.locationId))
    return Promise.all(visibleRequests.map(hydrateRequest))
}

export async function getAutoCareServiceRequest(user: UserEntity, requestId: string, emergencyReason?: string) {
    requestId = requireAutoCareRequestUuid(requestId)
    requireSuperAdminRequestAccessReason(user, emergencyReason)
    const request = await getRequest(requestId)
    await assertParticipant(user, request)
    return hydrateRequest(request)
}
