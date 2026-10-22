import { In } from 'typeorm'
import type { SelectQueryBuilder } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveProviderEntity, AutomotiveServiceDefinitionEntity, AutomotiveServiceLocationEntity, AutomotiveServiceOfferingEntity, AutoCareServiceQuoteEntity, AutoCareRescheduleRequestEntity, AutoCareRescheduleStatus, ServiceRequestEntity } from '../../entities/index.js'
import { type UserEntity } from '../../entities/user/user.entity.js'
import { assertCursorDate, decodeCursor, encodeCursor, getCursorLimit } from '../../shared/http/cursor-pagination.js'
import type { AutoCareQuoteLineItemResponse, AutoCareServiceQuoteHistoryResponse } from './autocare.types.js'
import { getManagedProviderPermissionScopes } from './provider-access.service.js'
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
    const quoteHistory = (await AppDataSource.getRepository(AutoCareServiceQuoteEntity).find({
        where: { requestId: request.id },
        order: { version: 'DESC' },
        take: 50,
    })).reverse()
    const pendingReschedule = await AppDataSource.getRepository(AutoCareRescheduleRequestEntity).findOne({
        where: { requestId: request.id, status: AutoCareRescheduleStatus.Pending },
        order: { createdAt: 'DESC' },
    })
    if (!provider || !location || !definition) notFound('Service request references missing service data.')
    return requestResponse(request, provider, location, definition, offering, quoteHistory.map(quoteResponse), pendingReschedule ? rescheduleResponse(pendingReschedule) : null)
}

function quoteResponse(quote: AutoCareServiceQuoteEntity): AutoCareServiceQuoteHistoryResponse {
    return {
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
    }
}

/** Hydrate one bounded page with a fixed number of relation queries. */
async function hydrateRequestPage(requests: ServiceRequestEntity[]) {
    if (requests.length === 0) return []
    const ids = requests.map((request) => request.id)
    const [providers, locations, definitions, offerings, quotes, reschedules] = await Promise.all([
        AppDataSource.getRepository(AutomotiveProviderEntity).find({ where: { id: In([...new Set(requests.map((request) => request.providerId))]) } }),
        AppDataSource.getRepository(AutomotiveServiceLocationEntity).find({ where: { id: In([...new Set(requests.map((request) => request.locationId))]) } }),
        AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).find({ where: { id: In([...new Set(requests.map((request) => request.definitionId))]) } }),
        AppDataSource.getRepository(AutomotiveServiceOfferingEntity).find({ where: { id: In([...new Set(requests.map((request) => request.offeringId).filter((id): id is string => id !== null))]) } }),
        AppDataSource.getRepository(AutoCareServiceQuoteEntity).createQueryBuilder('quote')
            .where('quote.id IN (SELECT ranked.id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY "requestId" ORDER BY version DESC) AS row_number FROM autocare_service_quotes WHERE "requestId" IN (:...ids)) ranked WHERE ranked.row_number <= 50)', { ids })
            .orderBy('quote.requestId', 'ASC').addOrderBy('quote.version', 'ASC').getMany(),
        AppDataSource.getRepository(AutoCareRescheduleRequestEntity).find({ where: { requestId: In(ids), status: AutoCareRescheduleStatus.Pending } }),
    ])
    const providerById = new Map(providers.map((provider) => [provider.id, provider]))
    const locationById = new Map(locations.map((location) => [location.id, location]))
    const definitionById = new Map(definitions.map((definition) => [definition.id, definition]))
    const offeringById = new Map(offerings.map((offering) => [offering.id, offering]))
    const quotesByRequest = new Map<string, AutoCareServiceQuoteEntity[]>()
    for (const quote of quotes) {
        const history = quotesByRequest.get(quote.requestId) ?? []
        history.push(quote)
        quotesByRequest.set(quote.requestId, history)
    }
    const rescheduleByRequest = new Map(reschedules.map((reschedule) => [reschedule.requestId, reschedule]))
    return requests.map((request) => {
        const provider = providerById.get(request.providerId)
        const location = locationById.get(request.locationId)
        const definition = definitionById.get(request.definitionId)
        if (!provider || !location || !definition) notFound('Service request references missing service data.')
        const offering = request.offeringId ? offeringById.get(request.offeringId) ?? null : null
        const quoteHistory = (quotesByRequest.get(request.id) ?? []).map(quoteResponse)
        const reschedule = rescheduleByRequest.get(request.id)
        return requestResponse(request, provider, location, definition, offering, quoteHistory, reschedule ? rescheduleResponse(reschedule) : null)
    })
}

async function hydrateRequestList(requests: ServiceRequestEntity[]) {
    const hydrated = []
    for (let index = 0; index < requests.length; index += 50) {
        hydrated.push(...await hydrateRequestPage(requests.slice(index, index + 50)))
    }
    return hydrated
}

type RequestPageInput = { cursor?: string; limit?: number }

function applyRequestCursor(query: SelectQueryBuilder<ServiceRequestEntity>, cursor?: string) {
    if (!cursor) return query
    const value = decodeCursor(cursor, ['createdAt', 'id'])
    return query.andWhere('(serviceRequest.createdAt < :cursorCreatedAt OR (serviceRequest.createdAt = :cursorCreatedAt AND serviceRequest.id < :cursorId))', {
        cursorCreatedAt: assertCursorDate(value, 'createdAt'),
        cursorId: value.id,
    })
}

async function toRequestPage(query: SelectQueryBuilder<ServiceRequestEntity>, input: RequestPageInput) {
    const limit = getCursorLimit(input.limit, 50)
    const rows = await applyRequestCursor(query, input.cursor)
        .orderBy('serviceRequest.createdAt', 'DESC').addOrderBy('serviceRequest.id', 'DESC')
        .take(limit + 1).getMany()
    const page = rows.slice(0, limit)
    const last = page.at(-1)
    return {
        items: await hydrateRequestPage(page),
        nextCursor: rows.length > limit && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null,
    }
}

export async function getMyAutoCareServiceRequestPage(user: UserEntity, input: RequestPageInput = {}) {
    clientOnly(user)
    const query = AppDataSource.getRepository(ServiceRequestEntity).createQueryBuilder('serviceRequest')
        .where('serviceRequest.clientId = :clientId', { clientId: user.id })
    return toRequestPage(query, input)
}

export async function getMyAutoCareServiceRequests(user: UserEntity) {
    clientOnly(user)
    const requests = await AppDataSource.getRepository(ServiceRequestEntity).find({ where: { clientId: user.id }, order: { createdAt: 'DESC', id: 'DESC' } })
    return hydrateRequestList(requests)
}

export async function getOwnerAutoCareServiceRequestPage(user: UserEntity, input: RequestPageInput = {}) {
    const scopes = await getManagedProviderPermissionScopes(user.id, 'requests')
    const providerIds = scopes.map(({ providerId }) => providerId)
    const providers = providerIds.length === 0
        ? []
        : await AppDataSource.getRepository(AutomotiveProviderEntity).find({ where: { id: In(providerIds) } })
    if (providers.length === 0) return { items: [], nextCursor: null }
    const existingProviderIds = new Set(providers.map((provider) => provider.id))
    const clauses = scopes.flatMap((scope, index) => {
        if (!existingProviderIds.has(scope.providerId)) return []
        return scope.locationIds === null
            ? [`serviceRequest.providerId = :provider${index}`]
            : scope.locationIds.length > 0 ? [`(serviceRequest.providerId = :provider${index} AND serviceRequest.locationId IN (:...locations${index}))`] : []
    })
    if (clauses.length === 0) return { items: [], nextCursor: null }
    const parameters: Record<string, string | string[]> = {}
    for (const [index, scope] of scopes.entries()) {
        parameters[`provider${index}`] = scope.providerId
        if (scope.locationIds) parameters[`locations${index}`] = scope.locationIds
    }
    const query = AppDataSource.getRepository(ServiceRequestEntity).createQueryBuilder('serviceRequest')
        .where(`(${clauses.join(' OR ')})`, parameters)
    return toRequestPage(query, input)
}

export async function getOwnerAutoCareServiceRequests(user: UserEntity) {
    const scopes = await getManagedProviderPermissionScopes(user.id, 'requests')
    const clauses: string[] = []
    const parameters: Record<string, string | string[]> = {}
    for (const [index, scope] of scopes.entries()) {
        if (scope.locationIds?.length === 0) continue
        parameters[`provider${index}`] = scope.providerId
        if (scope.locationIds) parameters[`locations${index}`] = scope.locationIds
        clauses.push(`(serviceRequest.providerId = :provider${index}${scope.locationIds ? ` AND serviceRequest.locationId IN (:...locations${index})` : ''})`)
    }
    if (clauses.length === 0) return []
    const requests = await AppDataSource.getRepository(ServiceRequestEntity).createQueryBuilder('serviceRequest')
        .where(`(${clauses.join(' OR ')})`, parameters)
        .orderBy('serviceRequest.createdAt', 'DESC').addOrderBy('serviceRequest.id', 'DESC').getMany()
    return hydrateRequestList(requests)
}

export async function getAutoCareServiceRequest(user: UserEntity, requestId: string, emergencyReason?: string) {
    requestId = requireAutoCareRequestUuid(requestId)
    requireSuperAdminRequestAccessReason(user, emergencyReason)
    const request = await getRequest(requestId)
    await assertParticipant(user, request)
    return hydrateRequest(request)
}
