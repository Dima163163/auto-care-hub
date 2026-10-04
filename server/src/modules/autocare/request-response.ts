import { AutomotiveProviderEntity, AutomotiveServiceDefinitionEntity, AutomotiveServiceLocationEntity, AutomotiveServiceOfferingEntity, AutoCareQuoteStatus, AutoCareRescheduleRequestEntity, ServiceMessageEntity, ServiceRequestEntity } from '../../entities/index.js'
import type { AutoCareServiceRequestResponse, AutoCareServiceMessageResponse, AutoCareQuoteLineItemResponse, AutoCareServiceQuoteHistoryResponse, AutoCareBookingSnapshotResponse, AutoCareRescheduleResponse } from './autocare.types.js'
import { getAutoCareQuoteLifecycleStatus } from './quote-policy.js'
import { createOfferingSnapshot } from './request-snapshots.js'

export function requestResponse(
    request: ServiceRequestEntity,
    provider: AutomotiveProviderEntity,
    location: AutomotiveServiceLocationEntity,
    definition: AutomotiveServiceDefinitionEntity,
    offering: AutomotiveServiceOfferingEntity | null,
    quoteHistory: AutoCareServiceQuoteHistoryResponse[] = [],
    reschedule: AutoCareRescheduleResponse | null = null,
): AutoCareServiceRequestResponse {
    const snapshot = request.offeringSnapshot ?? (offering ? createOfferingSnapshot(definition, offering) : null)
    const latestQuote = quoteHistory.at(-1)
    const snapshotQuoteStatus = Object.values(AutoCareQuoteStatus).includes(request.estimateSnapshot?.quoteStatus as AutoCareQuoteStatus)
        ? request.estimateSnapshot?.quoteStatus as AutoCareQuoteStatus
        : AutoCareQuoteStatus.Pending
    const quoteStatus = latestQuote?.status ?? getAutoCareQuoteLifecycleStatus(
        snapshotQuoteStatus,
        typeof request.estimateSnapshot?.validUntil === 'string' ? request.estimateSnapshot.validUntil : null,
    )
    return {
        id: request.id,
        providerId: provider.id,
        providerName: provider.name,
        locationId: location.id,
        address: location.address,
        definitionId: definition.id,
        serviceSlug: snapshot?.serviceSlug ?? definition.slug,
        serviceLabels: snapshot?.serviceLabels ?? definition.labels,
        serviceDescription: snapshot?.description ?? offering?.description ?? null,
        offeringId: offering?.id ?? null,
        priceFromMinor: snapshot?.priceFromMinor ?? offering?.priceFromMinor ?? null,
        currencyCode: snapshot?.currencyCode ?? offering?.currencyCode ?? null,
        preferredAt: request.preferredAt?.toISOString() ?? null,
        timezone: location.timezone ?? null,
        vehicleId: request.vehicleId,
        vehicleSnapshot: request.vehicleSnapshot as AutoCareServiceRequestResponse['vehicleSnapshot'],
        contactSnapshot: request.contactSnapshot as AutoCareServiceRequestResponse['contactSnapshot'],
        note: request.note,
        quote: request.estimateSnapshot && typeof request.estimateSnapshot.amountMinor === 'number'
            ? {
                amountMinor: request.estimateSnapshot.amountMinor,
                lineItems: Array.isArray(request.estimateSnapshot.lineItems) ? request.estimateSnapshot.lineItems as AutoCareQuoteLineItemResponse[] : [],
                subtotalMinor: typeof request.estimateSnapshot.subtotalMinor === 'number' ? request.estimateSnapshot.subtotalMinor : request.estimateSnapshot.amountMinor,
                taxMinor: typeof request.estimateSnapshot.taxMinor === 'number' ? request.estimateSnapshot.taxMinor : 0,
                feesMinor: typeof request.estimateSnapshot.feesMinor === 'number' ? request.estimateSnapshot.feesMinor : 0,
                currencyCode: String(request.estimateSnapshot.currencyCode ?? 'RUB'),
                note: typeof request.estimateSnapshot.note === 'string' ? request.estimateSnapshot.note : null,
                validUntil: typeof request.estimateSnapshot.validUntil === 'string' ? request.estimateSnapshot.validUntil : null,
                priceLocked: request.estimateSnapshot.priceLocked === true,
                createdAt: String(request.estimateSnapshot.createdAt ?? request.updatedAt.toISOString()),
                status: quoteStatus,
            }
            : null,
        quoteHistory,
        acceptedQuoteVersion: request.acceptedQuoteVersion,
        acceptedQuoteSnapshot: request.acceptedQuoteSnapshot,
        acceptedQuoteAt: request.acceptedQuoteAt?.toISOString() ?? null,
        booking: toBookingSnapshotResponse(request.bookingSnapshot),
        status: request.status,
        clientConfirmedAt: request.clientConfirmedAt?.toISOString() ?? null,
        providerConfirmedAt: request.providerConfirmedAt?.toISOString() ?? null,
        cancelledAt: request.cancelledAt?.toISOString() ?? null,
        cancelledById: request.cancelledById,
        cancellationReason: request.cancellationReason,
        noShowAt: request.noShowAt?.toISOString() ?? null,
        noShowById: request.noShowById,
        noShowReason: request.noShowReason,
        completedAt: request.completedAt?.toISOString() ?? null,
        completedById: request.completedById,
        completionNote: request.completionNote,
        reschedule,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
    }
}

function toBookingSnapshotResponse(snapshot: Record<string, unknown> | null): AutoCareBookingSnapshotResponse | null {
    if (!snapshot || typeof snapshot.requestId !== 'string' || typeof snapshot.quoteVersion !== 'number' ||
        typeof snapshot.amountMinor !== 'number' || typeof snapshot.currencyCode !== 'string' ||
        typeof snapshot.scheduledAt !== 'string' || typeof snapshot.timezone !== 'string' ||
        typeof snapshot.serviceSlug !== 'string' || typeof snapshot.providerId !== 'string' ||
        typeof snapshot.locationId !== 'string' || typeof snapshot.createdAt !== 'string') return null
    const lineItems = Array.isArray(snapshot.lineItems) ? snapshot.lineItems : []
    return {
        requestId: snapshot.requestId,
        quoteVersion: snapshot.quoteVersion,
        amountMinor: snapshot.amountMinor,
        currencyCode: snapshot.currencyCode,
        lineItems: lineItems as AutoCareBookingSnapshotResponse['lineItems'],
        scheduledAt: snapshot.scheduledAt,
        timezone: snapshot.timezone,
        serviceSlug: snapshot.serviceSlug,
        providerId: snapshot.providerId,
        locationId: snapshot.locationId,
        status: 'confirmed',
        createdAt: snapshot.createdAt,
        ...(typeof snapshot.vehicleId === 'string' ? { vehicleId: snapshot.vehicleId } : {}),
        ...(snapshot.vehicleSnapshot && typeof snapshot.vehicleSnapshot === 'object' ? { vehicleSnapshot: snapshot.vehicleSnapshot as AutoCareBookingSnapshotResponse['vehicleSnapshot'] } : {}),
        ...(typeof snapshot.bonusDiscountMinor === 'number' ? { bonusDiscountMinor: snapshot.bonusDiscountMinor } : {}),
        ...(typeof snapshot.payableAmountMinor === 'number' ? { payableAmountMinor: snapshot.payableAmountMinor } : {}),
    }
}

export function messageResponse(message: ServiceMessageEntity): AutoCareServiceMessageResponse {
    return {
        id: message.id,
        senderId: message.senderId,
        kind: message.kind,
        body: message.body,
        offer: message.offer,
        deliveredAt: message.deliveredAt?.toISOString() ?? null,
        readAt: message.readAt?.toISOString() ?? null,
        deletedAt: message.deletedAt?.toISOString() ?? null,
        createdAt: message.createdAt.toISOString(),
    }
}

export function rescheduleResponse(request: AutoCareRescheduleRequestEntity): AutoCareRescheduleResponse {
    return {
        id: request.id,
        proposedAt: request.proposedAt.toISOString(),
        requestedById: request.requestedById,
        status: request.status,
        reason: request.reason,
        resolvedById: request.resolvedById,
        resolutionReason: request.resolutionReason,
        createdAt: request.createdAt.toISOString(),
        resolvedAt: request.resolvedAt?.toISOString() ?? null,
    }
}
