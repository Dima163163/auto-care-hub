import { BookingEntity } from '../../entities/booking/booking.entity.js'
import { CabinetEntity } from '../../entities/cabinet/cabinet.entity.js'
import { FavoriteCabinetEntity } from '../../entities/favorite-cabinet/favorite-cabinet.entity.js'
import { NotificationEntity } from '../../entities/notification/notification.entity.js'
import { UserEntity } from '../../entities/user/user.entity.js'
import { ClientVehicleEntity } from '../../entities/user/client-vehicle.entity.js'
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
}

function serializeDate(value: Date | null | undefined) {
    return value?.toISOString() ?? null
}

export function serializeUserDataExport(
    user: UserEntity,
    collections: UserDataExportCollections,
    generatedAt = new Date().toISOString(),
) {
    const { favorites, bookings, notifications, cabinets, vehicles } = collections

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
    }

    return {
        ...exportPayload,
        integrity: {
            algorithm: 'sha256' as const,
            checksum: getDataExportIntegrityChecksum(exportPayload),
        },
    }
}
