import { In } from 'typeorm'

import { AppDataSource } from '../database/data-source.js'
import { AuditLogEntity } from '../entities/audit-log/audit-log.entity.js'
import { BookingEntity } from '../entities/booking/booking.entity.js'
import { CabinetEntity } from '../entities/cabinet/cabinet.entity.js'
import { NotificationEntity } from '../entities/notification/notification.entity.js'
import { ReviewEntity } from '../entities/review/review.entity.js'
import { SecurityTokenEntity } from '../entities/security-token/security-token.entity.js'
import { ServiceEntity } from '../entities/service/service.entity.js'
import { UserSessionEntity } from '../entities/user-session/user-session.entity.js'
import { UserEntity } from '../entities/user/user.entity.js'
import {
    DEMO_CABINET_TITLE,
    DEMO_USER_EMAILS,
} from './demo-fixtures.js'

function idsOf(records: Array<{ id: string }>) {
    return records.map(({ id }) => id)
}

async function resetDemoData() {
    await AppDataSource.initialize()

    try {
        await AppDataSource.transaction(async (manager) => {
            const userRepository = manager.getRepository(UserEntity)
            const cabinetRepository = manager.getRepository(CabinetEntity)
            const serviceRepository = manager.getRepository(ServiceEntity)
            const bookingRepository = manager.getRepository(BookingEntity)

            const users = await userRepository.find({
                where: {
                    email: In(DEMO_USER_EMAILS),
                },
            })
            const userIds = idsOf(users)

            const cabinets = await cabinetRepository.find({
                where: {
                    title: DEMO_CABINET_TITLE,
                },
            })
            const cabinetIds = idsOf(cabinets)

            const services = cabinetIds.length > 0
                ? await serviceRepository.find({
                    where: {
                        cabinetId: In(cabinetIds),
                    },
                })
                : []
            const serviceIds = idsOf(services)

            const bookingWhere = [
                ...(userIds.length > 0 ? [{ clientId: In(userIds) }] : []),
                ...(cabinetIds.length > 0 ? [{ cabinetId: In(cabinetIds) }] : []),
                ...(serviceIds.length > 0 ? [{ serviceId: In(serviceIds) }] : []),
            ]

            const bookings = bookingWhere.length > 0
                ? await bookingRepository.find({ where: bookingWhere })
                : []
            const bookingIds = idsOf(bookings)

            const auditTargetIds = [
                ...userIds,
                ...cabinetIds,
                ...serviceIds,
                ...bookingIds,
            ]

            if (userIds.length > 0) {
                await manager.getRepository(AuditLogEntity).delete([
                    { actorId: In(userIds) },
                    { targetId: In(auditTargetIds) },
                ])
                await manager.getRepository(NotificationEntity).delete({ userId: In(userIds) })
                await manager.getRepository(SecurityTokenEntity).delete({ userId: In(userIds) })
                await manager.getRepository(UserSessionEntity).delete({ userId: In(userIds) })
            } else if (auditTargetIds.length > 0) {
                await manager.getRepository(AuditLogEntity).delete({ targetId: In(auditTargetIds) })
            }

            const reviewWhere = [
                ...(bookingIds.length > 0 ? [{ bookingId: In(bookingIds) }] : []),
                ...(cabinetIds.length > 0 ? [{ cabinetId: In(cabinetIds) }] : []),
                ...(userIds.length > 0 ? [{ clientId: In(userIds) }] : []),
            ]

            if (reviewWhere.length > 0) {
                await manager.getRepository(ReviewEntity).delete(reviewWhere)
            }

            if (bookingIds.length > 0) {
                await bookingRepository.delete({ id: In(bookingIds) })
            }

            if (serviceIds.length > 0) {
                await serviceRepository.delete({ id: In(serviceIds) })
            }

            if (cabinetIds.length > 0) {
                await cabinetRepository.delete({ id: In(cabinetIds) })
            }

            if (userIds.length > 0) {
                await userRepository.delete({ id: In(userIds) })
            }

            console.info('Demo data reset successfully.')
        })
    } finally {
        await AppDataSource.destroy()
    }
}

resetDemoData().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
})
