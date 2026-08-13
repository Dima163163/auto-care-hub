import { BookingEntity } from '../../entities/booking/booking.entity.js'
import { CabinetEntity } from '../../entities/cabinet/cabinet.entity.js'
import { FavoriteCabinetEntity } from '../../entities/favorite-cabinet/favorite-cabinet.entity.js'
import { NotificationEntity } from '../../entities/notification/notification.entity.js'
import { UserEntity, UserRole } from '../../entities/user/user.entity.js'
import { ClientVehicleEntity } from '../../entities/user/client-vehicle.entity.js'
import { AppDataSource } from '../../database/data-source.js'
import {
    MAX_EXPORT_RECORDS,
    serializeUserDataExport,
} from './data-export.serializer.js'

export async function getUserDataExport(user: UserEntity) {
    const [favorites, bookings, notifications, cabinets, vehicles] = await Promise.all([
        AppDataSource.getRepository(FavoriteCabinetEntity).find({
            where: { userId: user.id },
            order: { createdAt: 'ASC' },
            take: MAX_EXPORT_RECORDS + 1,
        }),
        AppDataSource.getRepository(BookingEntity).find({
            where: { clientId: user.id },
            order: { createdAt: 'ASC' },
            take: MAX_EXPORT_RECORDS + 1,
        }),
        AppDataSource.getRepository(NotificationEntity).find({
            where: { userId: user.id },
            order: { createdAt: 'ASC' },
            take: MAX_EXPORT_RECORDS + 1,
        }),
        user.role === UserRole.Owner
            ? AppDataSource.getRepository(CabinetEntity).find({
                where: { ownerId: user.id },
                order: { createdAt: 'ASC' },
                take: MAX_EXPORT_RECORDS + 1,
            })
            : Promise.resolve([] as CabinetEntity[]),
        user.role === UserRole.Client
            ? AppDataSource.getRepository(ClientVehicleEntity).find({
                where: { userId: user.id },
                order: { createdAt: 'ASC' },
                take: MAX_EXPORT_RECORDS + 1,
            })
            : Promise.resolve([] as ClientVehicleEntity[]),
    ])

    return serializeUserDataExport(user, {
        favorites,
        bookings,
        notifications,
        cabinets,
        vehicles,
    })
}
