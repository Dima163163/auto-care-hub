import { AppDataSource } from '../../database/data-source.js'
import {
    UserEntity,
    UserRole,
    UserStatus,
} from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { toOwnerClient } from './users.mappers.js'
import { toPublicUser } from '../auth/public-user.js'
import { assertNotificationPreferenceMutation } from '../notifications/notification-preference-mutation.js'
import {
    normalizePreferredCategories,
    normalizePreferredCity,
    normalizeUserLocale,
} from './user-preferences-policy.js'
import type { SupportedLocale } from '../../config/i18n.js'
import { getOwnerClientListLimit } from './user-list-policy.js'

type UpdateUserPreferencesInput = {
    emailNotifications?: boolean
    bookingEmailNotifications?: boolean
    preferredCity?: string | null
    preferredCategories?: string[]
    locale?: SupportedLocale | null
}

export async function updateUserPreferences(
    user: UserEntity,
    input: UpdateUserPreferencesInput
) {
    const userRepository = AppDataSource.getRepository(UserEntity)
    const preferredCity = normalizePreferredCity(input.preferredCity)
    const preferredCategories = input.preferredCategories === undefined
        ? undefined
        : normalizePreferredCategories(input.preferredCategories)
    const locale = normalizeUserLocale(input.locale)

    const notificationMutation = Object.fromEntries(
        Object.entries({
            emailNotifications: input.emailNotifications,
            bookingEmailNotifications: input.bookingEmailNotifications,
        }).filter(([, value]) => value !== undefined),
    )
    if (Object.keys(notificationMutation).length > 0) {
        assertNotificationPreferenceMutation(notificationMutation)
    }

    if (input.emailNotifications !== undefined) {
        user.emailNotifications = input.emailNotifications
    }

    if (input.bookingEmailNotifications !== undefined) {
        user.bookingEmailNotifications = input.bookingEmailNotifications
    }

    if (input.preferredCity !== undefined) {
        user.preferredCity = preferredCity ?? null
    }

    if (input.preferredCategories !== undefined) {
        user.preferredCategories = preferredCategories ?? []
    }

    if (input.locale !== undefined) {
        user.locale = locale ?? null
    }

    const savedUser = await userRepository.save(user)

    return toPublicUser(savedUser)
}

function assertOwner(user: UserEntity) {
    if (user.role !== UserRole.Owner) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only owners can use this endpoint.',
        })
    }
}

export async function getOwnerClients(owner: UserEntity) {
    assertOwner(owner)

    const userRepository = AppDataSource.getRepository(UserEntity)

    const clients = await userRepository.find({
        where: {
            role: UserRole.Client,
            status: UserStatus.Active,
        },
        order: {
            name: 'ASC',
        },
        take: getOwnerClientListLimit(),
    })

    return clients.map(toOwnerClient)
}
