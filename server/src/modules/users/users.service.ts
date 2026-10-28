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
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { getManagedProviderPermissionScopes, isManagedProviderLocationAllowed } from '../autocare/provider-access.service.js'
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

    const changes: Partial<Pick<UserEntity,
        'emailNotifications' | 'bookingEmailNotifications' | 'preferredCity' | 'preferredCategories' | 'locale'>> = {}
    if (normalizedInput.emailNotifications !== undefined) changes.emailNotifications = normalizedInput.emailNotifications
    if (normalizedInput.bookingEmailNotifications !== undefined) changes.bookingEmailNotifications = normalizedInput.bookingEmailNotifications
    if (normalizedInput.preferredCity !== undefined) changes.preferredCity = preferredCity ?? null
    if (normalizedInput.preferredCategories !== undefined) changes.preferredCategories = preferredCategories ?? []
    if (normalizedInput.locale !== undefined) changes.locale = locale ?? null

    if (Object.hasOwn(changes, 'preferredCity')) {
        const currentUser = await AppDataSource.transaction(async (manager) => {
            const repository = manager.getRepository(UserEntity)
            const current = await repository.findOne({
                where: { id: user.id, status: UserStatus.Active, tokenVersion: user.tokenVersion },
                lock: { mode: 'pessimistic_write' },
            })
            if (!current) {
                throw new AppError({ statusCode: 401, code: ERROR_CODES.Unauthorized, message: 'Session has expired. Please login again.' })
            }
            Object.assign(current, changes)
            return repository.save(current)
        })
        return toPublicUser(currentUser)
    }

    if (Object.keys(changes).length > 0) {
        // The auth snapshot can predate a block, password reset, or logout-all.
        // Update only preference columns and reject requests from that old version.
        const result = await userRepository.update(
            { id: user.id, status: UserStatus.Active, tokenVersion: user.tokenVersion },
            changes,
        )
        if (result.affected !== 1) {
            throw new AppError({ statusCode: 401, code: ERROR_CODES.Unauthorized, message: 'Session has expired. Please login again.' })
        }
    }

    const currentUser = await userRepository.findOneBy({
        id: user.id,
        status: UserStatus.Active,
        tokenVersion: user.tokenVersion,
    })
    if (!currentUser) {
        throw new AppError({ statusCode: 401, code: ERROR_CODES.Unauthorized, message: 'Session has expired. Please login again.' })
    }
    return toPublicUser(currentUser)
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
    const requestScopes = await getManagedProviderPermissionScopes(owner.id, 'requests')
    const requestProviderIds = requestScopes.map(({ providerId }) => providerId)

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
        requestProviderIds.length === 0
            ? Promise.resolve([])
            : AppDataSource.getRepository(ServiceRequestEntity)
            .createQueryBuilder('request')
            .where('request.providerId IN (:...providerIds)', { providerIds: requestProviderIds })
            .select('request.clientId', 'clientId')
            .addSelect('request.providerId', 'providerId')
            .addSelect('request.locationId', 'locationId')
            .distinct(true)
            .getRawMany<{ clientId: string; providerId: string; locationId: string | null }>(),
    ])
    const scopedServiceRequestClients = serviceRequestClients.filter(({ providerId, locationId }) =>
        isManagedProviderLocationAllowed(requestScopes, providerId, locationId),
    )
    const clientIds = [...new Set(
        [...bookingClients, ...scopedServiceRequestClients]
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
