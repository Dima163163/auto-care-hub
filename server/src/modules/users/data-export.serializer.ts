import { BookingEntity } from '../../entities/booking/booking.entity.js'
import { CabinetEntity } from '../../entities/cabinet/cabinet.entity.js'
import { FavoriteCabinetEntity } from '../../entities/favorite-cabinet/favorite-cabinet.entity.js'
import { NotificationEntity } from '../../entities/notification/notification.entity.js'
import { UserEntity } from '../../entities/user/user.entity.js'
import { ClientVehicleEntity } from '../../entities/user/client-vehicle.entity.js'
import {
    AutoCareBroadcastRequestEntity,
    AutoCareChatThreadEntity,
    AutoCareExpertQuestionEntity,
    AutoCareFleetAccountEntity,
    AutoCareGuaranteeClaimEntity,
    ServiceAttachmentEntity,
    ServiceMessageEntity,
    ServiceRequestEntity,
} from '../../entities/index.js'
import { AutoCareServiceQuoteEntity } from '../../entities/index.js'
import { toPublicUser } from '../auth/public-user.js'
import { sanitizeExportMetadata } from './data-export-privacy.js'
import { getDataExportIntegrityChecksum } from './data-export-integrity.js'

export const MAX_EXPORT_RECORDS = 5_000

export type UserDataExportCollections = {
    favorites: FavoriteCabinetEntity[]
    bookings: BookingEntity[]
    notifications: NotificationEntity[]
    cabinets: CabinetEntity[]
    vehicles: ClientVehicleEntity[]
    serviceRequests: ServiceRequestEntity[]
    broadcasts: AutoCareBroadcastRequestEntity[]
    claims: AutoCareGuaranteeClaimEntity[]
    questions: AutoCareExpertQuestionEntity[]
    chats: AutoCareChatThreadEntity[]
    messages: ServiceMessageEntity[]
    attachments: ServiceAttachmentEntity[]
    fleets: AutoCareFleetAccountEntity[]
    quotes?: AutoCareServiceQuoteEntity[]
}

function serializeDate(value: Date | null | undefined) {
    return value?.toISOString() ?? null
}

export function serializeUserDataExport(
    user: UserEntity,
    collections: UserDataExportCollections,
    generatedAt = new Date().toISOString(),
) {
    const {
        favorites,
        bookings,
        notifications,
        cabinets,
        vehicles,
        serviceRequests,
        broadcasts,
        claims,
        questions,
        chats,
        messages,
        attachments,
        fleets,
        quotes = [],
    } = collections

    const exportPayload = {
        schemaVersion: 1,
        generatedAt,
        limits: {
            maxRecordsPerCollection: MAX_EXPORT_RECORDS,
        },
        truncated: {
            favorites: favorites.length > MAX_EXPORT_RECORDS,
            bookings: bookings.length > MAX_EXPORT_RECORDS,
            notifications: notifications.length > MAX_EXPORT_RECORDS,
            cabinets: cabinets.length > MAX_EXPORT_RECORDS,
            vehicles: vehicles.length > MAX_EXPORT_RECORDS,
            serviceRequests: serviceRequests.length > MAX_EXPORT_RECORDS,
            broadcasts: broadcasts.length > MAX_EXPORT_RECORDS,
            claims: claims.length > MAX_EXPORT_RECORDS,
            questions: questions.length > MAX_EXPORT_RECORDS,
            chats: chats.length > MAX_EXPORT_RECORDS,
            messages: messages.length > MAX_EXPORT_RECORDS,
            attachments: attachments.length > MAX_EXPORT_RECORDS,
            fleets: fleets.length > MAX_EXPORT_RECORDS,
            quotes: quotes.length > MAX_EXPORT_RECORDS,
        },
        user: {
            ...toPublicUser(user),
            emailVerifiedAt: serializeDate(user.emailVerifiedAt),
            createdAt: serializeDate(user.createdAt),
        },
        favorites: favorites.slice(0, MAX_EXPORT_RECORDS).map((favorite) => ({
            id: favorite.id,
            cabinetId: favorite.cabinetId,
            createdAt: serializeDate(favorite.createdAt),
        })),
        bookings: bookings.slice(0, MAX_EXPORT_RECORDS).map((booking) => ({
            id: booking.id,
            cabinetId: booking.cabinetId,
            serviceId: booking.serviceId,
            date: booking.date,
            startTime: booking.startTime,
            endTime: booking.endTime,
            status: booking.status,
            comment: booking.comment,
            cancellationReason: booking.cancellationReason,
            createdAt: serializeDate(booking.createdAt),
        })),
        notifications: notifications.slice(0, MAX_EXPORT_RECORDS).map((notification) => ({
            id: notification.id,
            category: notification.category,
            title: notification.title,
            message: notification.message,
            link: notification.link,
            metadata: sanitizeExportMetadata(notification.metadata),
            readAt: serializeDate(notification.readAt),
            createdAt: serializeDate(notification.createdAt),
        })),
        cabinets: cabinets.slice(0, MAX_EXPORT_RECORDS).map((cabinet) => ({
            id: cabinet.id,
            title: cabinet.title,
            description: cabinet.description,
            address: cabinet.address,
            city: cabinet.city,
            timezone: cabinet.timezone,
            pricePerHour: cabinet.pricePerHour,
            status: cabinet.status,
            photos: cabinet.photos,
            amenities: cabinet.amenities,
            cancellationPolicy: cabinet.cancellationPolicy,
            houseRules: cabinet.houseRules,
            createdAt: serializeDate(cabinet.createdAt),
        })),
        vehicles: vehicles.slice(0, MAX_EXPORT_RECORDS).map((vehicle) => ({
            id: vehicle.id,
            brandId: vehicle.brandId,
            model: vehicle.model,
            year: vehicle.year,
            fuelType: vehicle.fuelType,
            engineDisplacement: vehicle.engineDisplacement,
            horsepower: vehicle.horsepower,
            color: vehicle.color,
            vin: vehicle.vin,
            imageUrl: vehicle.imageUrl,
            isPrimary: vehicle.isPrimary,
            createdAt: serializeDate(vehicle.createdAt),
        })),
        serviceRequests: serviceRequests.slice(0, MAX_EXPORT_RECORDS).map((request) => ({
            id: request.id,
            providerId: request.providerId,
            locationId: request.locationId,
            definitionId: request.definitionId,
            offeringId: request.offeringId,
            vehicleSnapshot: request.vehicleSnapshot,
            contactSnapshot: request.contactSnapshot,
            preferredAt: serializeDate(request.preferredAt),
            note: request.note,
            estimateSnapshot: request.estimateSnapshot,
            status: request.status,
            clientConfirmedAt: serializeDate(request.clientConfirmedAt),
            providerConfirmedAt: serializeDate(request.providerConfirmedAt),
            createdAt: serializeDate(request.createdAt),
            updatedAt: serializeDate(request.updatedAt),
        })),
        quoteHistory: quotes.slice(0, MAX_EXPORT_RECORDS).map((quote) => ({
            id: quote.id,
            requestId: quote.requestId,
            providerId: quote.providerId,
            version: quote.version,
            amountMinor: quote.amountMinor,
            currencyCode: quote.currencyCode,
            snapshot: quote.snapshot,
            validUntil: serializeDate(quote.validUntil),
            status: quote.status,
            createdAt: serializeDate(quote.createdAt),
        })),
        broadcasts: broadcasts.slice(0, MAX_EXPORT_RECORDS).map((broadcast) => ({
            id: broadcast.id,
            serviceDefinitionId: broadcast.serviceDefinitionId,
            marketId: broadcast.marketId,
            issueDescription: broadcast.issueDescription,
            vehicleSnapshot: broadcast.vehicleSnapshot,
            photoUrls: broadcast.photoUrls,
            preferredAt: serializeDate(broadcast.preferredAt),
            status: broadcast.status,
            maxProviders: broadcast.maxProviders,
            expiresAt: serializeDate(broadcast.expiresAt),
            createdAt: serializeDate(broadcast.createdAt),
        })),
        claims: claims.slice(0, MAX_EXPORT_RECORDS).map((claim) => ({
            id: claim.id,
            requestId: claim.requestId,
            providerId: claim.providerId,
            claimType: claim.claimType,
            status: claim.status,
            summary: claim.summary,
            evidenceUrls: claim.evidenceUrls,
            resolution: claim.resolution,
            resolvedAt: serializeDate(claim.resolvedAt),
            createdAt: serializeDate(claim.createdAt),
            updatedAt: serializeDate(claim.updatedAt),
        })),
        questions: questions.slice(0, MAX_EXPORT_RECORDS).map((question) => ({
            id: question.id,
            vehicleSnapshot: question.vehicleSnapshot,
            symptoms: question.symptoms,
            categorySlug: question.categorySlug,
            status: question.status,
            answer: question.answer,
            answeredAt: serializeDate(question.answeredAt),
            createdAt: serializeDate(question.createdAt),
            updatedAt: serializeDate(question.updatedAt),
        })),
        chats: chats.slice(0, MAX_EXPORT_RECORDS).map((chat) => ({
            id: chat.id,
            type: chat.type,
            requestId: chat.requestId,
            providerId: chat.providerId,
            subject: chat.subject,
            status: chat.status,
            lastMessageAt: serializeDate(chat.lastMessageAt),
            createdAt: serializeDate(chat.createdAt),
            updatedAt: serializeDate(chat.updatedAt),
        })),
        messages: messages.slice(0, MAX_EXPORT_RECORDS).map((message) => ({
            id: message.id,
            requestId: message.requestId,
            threadId: message.threadId,
            kind: message.kind,
            body: message.body,
            offer: message.offer,
            deliveredAt: serializeDate(message.deliveredAt),
            readAt: serializeDate(message.readAt),
            createdAt: serializeDate(message.createdAt),
        })),
        attachments: attachments.slice(0, MAX_EXPORT_RECORDS).map((attachment) => ({
            id: attachment.id,
            requestId: attachment.requestId,
            threadId: attachment.threadId,
            contentType: attachment.contentType,
            bytes: attachment.bytes,
            checksum: attachment.checksum,
            status: attachment.status,
            createdAt: serializeDate(attachment.createdAt),
        })),
        fleets: fleets.slice(0, MAX_EXPORT_RECORDS).map((fleet) => ({
            id: fleet.id,
            name: fleet.name,
            notes: fleet.notes,
            createdAt: serializeDate(fleet.createdAt),
            updatedAt: serializeDate(fleet.updatedAt),
        })),
    }

    return {
        ...exportPayload,
        integrity: {
            algorithm: 'sha256' as const,
            checksum: getDataExportIntegrityChecksum(exportPayload),
        },
    }
}
