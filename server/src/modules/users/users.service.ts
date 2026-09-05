import { In } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import {
    UserEntity,
    UserRole,
    UserStatus,
} from '../../entities/user/user.entity.js'
import { BookingEntity } from '../../entities/booking/booking.entity.js'
import { CabinetEntity } from '../../entities/cabinet/cabinet.entity.js'
import { ServiceRequestEntity } from '../../entities/automotive/service-request.entity.js'
import { AutomotiveProviderEntity } from '../../entities/automotive/automotive.entity.js'
import { AutomotiveProviderMembershipEntity, AutomotiveProviderMembershipStatus } from '../../entities/automotive/provider-membership.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { toOwnerClient } from './users.mappers.js'
import { toPublicUser } from '../auth/public-user.js'
import { assertNotificationPreferenceMutation } from '../notifications/notification-preference-mutation.js'
import { normalizeUserPreferencesInput } from './user-preferences-policy.js'
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
    const normalizedInput = normalizeUserPreferencesInput(input)
    if (!normalizedInput) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'User preferences are invalid.' })
    }
    const userRepository = AppDataSource.getRepository(UserEntity)
    const preferredCity = normalizedInput.preferredCity
    const preferredCategories = normalizedInput.preferredCategories === undefined
        ? undefined
        : normalizedInput.preferredCategories
    const locale = normalizedInput.locale

    const notificationMutation = Object.fromEntries(
        Object.entries({
            emailNotifications: normalizedInput.emailNotifications,
            bookingEmailNotifications: normalizedInput.bookingEmailNotifications,
        }).filter(([, value]) => value !== undefined),
    )
    if (Object.keys(notificationMutation).length > 0) {
        assertNotificationPreferenceMutation(notificationMutation)
    }

    if (normalizedInput.emailNotifications !== undefined) {
        user.emailNotifications = normalizedInput.emailNotifications
    }

    if (normalizedInput.bookingEmailNotifications !== undefined) {
        user.bookingEmailNotifications = normalizedInput.bookingEmailNotifications
    }

    if (normalizedInput.preferredCity !== undefined) {
        user.preferredCity = preferredCity ?? null
    }

    if (normalizedInput.preferredCategories !== undefined) {
        user.preferredCategories = preferredCategories ?? []
    }

    if (normalizedInput.locale !== undefined) {
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

    // Do not expose the entire client directory to an owner. A client is
    // discoverable only when they have an existing relationship with one of
    // the owner's legacy cabinets or AutoCare providers.
    const [bookingClients, serviceRequestClients] = await Promise.all([
        AppDataSource.getRepository(BookingEntity)
            .createQueryBuilder('booking')
            .innerJoin(
                CabinetEntity,
                'cabinet',
                'cabinet.id = booking.cabinetId AND cabinet.ownerId = :ownerId',
                { ownerId: owner.id },
            )
            .select('booking.clientId', 'clientId')
            .distinct(true)
            .getRawMany<{ clientId: string }>(),
        AppDataSource.getRepository(ServiceRequestEntity)
            .createQueryBuilder('request')
            .innerJoin(
                AutomotiveProviderEntity,
                'provider',
                'provider.id = request.providerId',
                { ownerId: owner.id },
            )
            .leftJoin(
                AutomotiveProviderMembershipEntity,
                'membership',
                'membership.providerId = provider.id AND membership.userId = :ownerId AND membership.status = :membershipStatus',
                { ownerId: owner.id, membershipStatus: AutomotiveProviderMembershipStatus.Active },
            )
            .andWhere('(provider.ownerId = :ownerId OR membership.id IS NOT NULL)', { ownerId: owner.id })
            .select('request.clientId', 'clientId')
            .distinct(true)
            .getRawMany<{ clientId: string }>(),
    ])
    const clientIds = [...new Set(
        [...bookingClients, ...serviceRequestClients]
            .map(({ clientId }) => clientId)
            .filter((clientId): clientId is string => Boolean(clientId)),
    )]
    if (clientIds.length === 0) return []

    const clients = await userRepository.find({
        where: {
            id: In(clientIds),
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
