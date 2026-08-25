import { BookingEntity } from '../../entities/booking/booking.entity.js'
import { CabinetEntity } from '../../entities/cabinet/cabinet.entity.js'
import { FavoriteCabinetEntity } from '../../entities/favorite-cabinet/favorite-cabinet.entity.js'
import { NotificationEntity } from '../../entities/notification/notification.entity.js'
import { UserEntity, UserRole } from '../../entities/user/user.entity.js'
import { ClientVehicleEntity } from '../../entities/user/client-vehicle.entity.js'
import {
    AutoCareChatThreadEntity,
    AutoCareBroadcastRequestEntity,
    AutoCareExpertQuestionEntity,
    AutoCareFleetAccountEntity,
    AutoCareGuaranteeClaimEntity,
    ServiceAttachmentEntity,
    ServiceMessageEntity,
    ServiceRequestEntity,
    AutoCareServiceQuoteEntity,
    AutomotiveProviderEntity,
} from '../../entities/index.js'
import { In } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import {
    MAX_EXPORT_RECORDS,
    serializeUserDataExport,
} from './data-export.serializer.js'

export async function getUserDataExport(user: UserEntity) {
    const [favorites, bookings, notifications, cabinets, vehicles, serviceRequests, broadcasts, claims, questions, chats, fleets] = await Promise.all([
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
        AppDataSource.getRepository(ServiceRequestEntity).find({
            where: { clientId: user.id },
            order: { createdAt: 'ASC' },
            take: MAX_EXPORT_RECORDS + 1,
        }),
        AppDataSource.getRepository(AutoCareBroadcastRequestEntity).find({
            where: { clientId: user.id },
            order: { createdAt: 'ASC' },
            take: MAX_EXPORT_RECORDS + 1,
        }),
        AppDataSource.getRepository(AutoCareGuaranteeClaimEntity).find({
            where: { clientId: user.id },
            order: { createdAt: 'ASC' },
            take: MAX_EXPORT_RECORDS + 1,
        }),
        AppDataSource.getRepository(AutoCareExpertQuestionEntity).find({
            where: { clientId: user.id },
            order: { createdAt: 'ASC' },
            take: MAX_EXPORT_RECORDS + 1,
        }),
        AppDataSource.getRepository(AutoCareChatThreadEntity).find({
            where: [{ clientId: user.id }, { createdById: user.id }],
            order: { createdAt: 'ASC' },
            take: MAX_EXPORT_RECORDS + 1,
        }),
        user.role === UserRole.Owner
            ? AppDataSource.getRepository(AutoCareFleetAccountEntity).find({
                where: { ownerId: user.id },
                order: { createdAt: 'ASC' },
                take: MAX_EXPORT_RECORDS + 1,
            })
            : Promise.resolve([] as AutoCareFleetAccountEntity[]),
    ])

    const requestIds = serviceRequests.slice(0, MAX_EXPORT_RECORDS).map(({ id }) => id)
    const providerIds = user.role === UserRole.Owner
        ? (await AppDataSource.getRepository(AutomotiveProviderEntity).find({ where: { ownerId: user.id }, select: { id: true }, take: MAX_EXPORT_RECORDS })).map(({ id }) => id)
        : []
    const threadIds = chats.slice(0, MAX_EXPORT_RECORDS).map(({ id }) => id)
    const [messages, attachments, quotes] = await Promise.all([
        requestIds.length > 0 || threadIds.length > 0
            ? AppDataSource.getRepository(ServiceMessageEntity).find({
                where: [
                    ...(requestIds.length > 0 ? [{ requestId: In(requestIds) }] : []),
                    ...(threadIds.length > 0 ? [{ threadId: In(threadIds) }] : []),
                ],
                order: { createdAt: 'ASC' },
                take: MAX_EXPORT_RECORDS + 1,
            })
            : Promise.resolve([] as ServiceMessageEntity[]),
        AppDataSource.getRepository(ServiceAttachmentEntity).find({
            where: { uploadedById: user.id },
            order: { createdAt: 'ASC' },
            take: MAX_EXPORT_RECORDS + 1,
        }),
        requestIds.length > 0 || providerIds.length > 0
            ? AppDataSource.getRepository(AutoCareServiceQuoteEntity).find({
                where: [
                    ...(requestIds.length > 0 ? [{ requestId: In(requestIds) }] : []),
                    ...(providerIds.length > 0 ? [{ providerId: In(providerIds) }] : []),
                ],
                order: { createdAt: 'ASC' },
                take: MAX_EXPORT_RECORDS + 1,
            })
            : Promise.resolve([] as AutoCareServiceQuoteEntity[]),
    ])

    return serializeUserDataExport(user, {
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
        quotes,
    })
}
