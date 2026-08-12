import { In, IsNull } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    NotificationCategory,
    NotificationEntity,
} from '../../entities/notification/notification.entity.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { logError } from '../../shared/observability/logger.js'
import { toNotification } from './notifications.mappers.js'
import type { Notification } from './notifications.types.js'
import type { NotificationsQuery } from './notifications.schemas.js'
import type { SupportedLocale } from '../../config/i18n.js'
import {
    assertCursorDate,
    decodeCursor,
    getCursorLimit,
    isCursorPaginationRequested,
    toCursorPage,
} from '../../shared/http/cursor-pagination.js'
import type { CursorPage } from '../../shared/http/cursor-pagination.js'
import { normalizeNotificationLink } from './notification-link-policy.js'
import { assertNotificationMetadataWithinBounds } from './notification-metadata-policy.js'
import {
    assertNotificationCategory,
    MAX_NOTIFICATION_MESSAGE_LENGTH,
    MAX_NOTIFICATION_TITLE_LENGTH,
    normalizeNotificationContent,
} from './notification-content-policy.js'
import { getNotificationMarkAllBatchSize } from './notification-action-policy.js'

type CreateNotificationInput = {
    category: NotificationCategory
    link?: string | null
    message: string
    metadata?: Record<string, unknown>
    title: string
    userId: string
}

export async function createNotificationSafely(input: CreateNotificationInput) {
    try {
        await createNotification(input)
    } catch (error) {
        logError('Failed to create notification', error, {
            category: input.category,
            userId: input.userId,
        })
    }
}

export async function createNotification(input: CreateNotificationInput) {
    const notificationRepository = AppDataSource.getRepository(NotificationEntity)
    const category = assertNotificationCategory(input.category)
    const notification = notificationRepository.create({
        userId: input.userId,
        category,
        title: normalizeNotificationContent(input.title, MAX_NOTIFICATION_TITLE_LENGTH, 'title'),
        message: normalizeNotificationContent(input.message, MAX_NOTIFICATION_MESSAGE_LENGTH, 'message'),
        link: normalizeNotificationLink(input.link),
        metadata: assertNotificationMetadataWithinBounds(input.metadata ?? {}),
    })

    return notificationRepository.save(notification)
}

export async function listNotifications(
    user: UserEntity,
    input?: NotificationsQuery,
    locale: SupportedLocale = 'en',
): Promise<Notification[] | CursorPage<Notification>> {
    const notificationRepository = AppDataSource.getRepository(NotificationEntity)
    const isPaginated = isCursorPaginationRequested(input ?? {})
    const limit = getCursorLimit(input?.limit)
    const category = input?.category ? assertNotificationCategory(input.category) : undefined
    const query = notificationRepository
        .createQueryBuilder('notification')
        .where('notification.userId = :userId', { userId: user.id })

    if (input?.read !== undefined) {
        query.andWhere(
            input.read
                ? 'notification.readAt IS NOT NULL'
                : 'notification.readAt IS NULL',
        )
    }

    if (category) {
        query.andWhere('notification.category = :category', { category })
    }

    if (input?.cursor) {
        const cursor = decodeCursor(input.cursor, ['createdAt', 'id'])
        const createdAt = assertCursorDate(cursor, 'createdAt')

        query.andWhere(`(
            notification.createdAt < :cursorCreatedAt
            OR (
                notification.createdAt = :cursorCreatedAt
                AND notification.id < :cursorId
            )
        )`, {
            cursorCreatedAt: createdAt,
            cursorId: cursor.id,
        })
    }

    query
        .orderBy('notification.createdAt', 'DESC')
        .addOrderBy('notification.id', 'DESC')

    const notifications = isPaginated
        ? await query.take(limit + 1).getMany()
        : await query.take(50).getMany()

    const mappedNotifications = notifications.map((notification) =>
        toNotification(notification, locale)
    )

    return isPaginated
        ? toCursorPage(mappedNotifications, limit, (notification) => ({
            createdAt: notification.createdAt,
            id: notification.id,
        }))
        : mappedNotifications
}

export async function getUnreadNotificationsCount(user: UserEntity) {
    const notificationRepository = AppDataSource.getRepository(NotificationEntity)

    return notificationRepository.count({
        where: {
            userId: user.id,
            readAt: IsNull(),
        },
    })
}

export async function markNotificationAsRead(
    user: UserEntity,
    notificationId: string,
    locale: SupportedLocale = 'en',
) {
    const notificationRepository = AppDataSource.getRepository(NotificationEntity)
    const notification = await notificationRepository.findOne({
        where: {
            id: notificationId,
            userId: user.id,
        },
    })

    if (!notification) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Notification not found.',
        })
    }

    if (!notification.readAt) {
        notification.readAt = new Date()
        await notificationRepository.save(notification)
    }

    return toNotification(notification, locale)
}

export async function markAllNotificationsAsRead(user: UserEntity) {
    const notificationRepository = AppDataSource.getRepository(NotificationEntity)
    const unreadNotifications = await notificationRepository.find({
        where: {
            userId: user.id,
            readAt: IsNull(),
        },
        select: ['id'],
        take: getNotificationMarkAllBatchSize(),
    })

    if (unreadNotifications.length === 0) {
        return {
            updated: 0,
        }
    }

    await notificationRepository.update(
        {
            id: In(unreadNotifications.map((notification) => notification.id)),
            userId: user.id,
        },
        {
            readAt: new Date(),
        }
    )

    return {
        updated: unreadNotifications.length,
    }
}
