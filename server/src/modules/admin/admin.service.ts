import { AppDataSource } from '../../database/data-source.js'
import { In } from 'typeorm'
import {
    CabinetEntity,
    CabinetStatus,
} from '../../entities/cabinet/cabinet.entity.js'
import {
    AutomotiveMarketEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveServiceLocationEntity,
} from '../../entities/automotive/automotive.entity.js'
import {
    UserEntity,
    UserProvider,
    UserRole,
    UserStatus,
} from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import {
    canManageUserStatus,
    isAdminRole,
    isSuperAdmin,
} from '../../shared/auth/roles.js'
import { createPasswordSetupTokenForUser } from '../auth/auth.service.js'
import { logError } from '../../shared/observability/logger.js'
import { toAdminCabinet, toAdminUser } from './admin.mappers.js'
import type { SupportedLocale } from '../../config/i18n.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { enqueuePasswordSetupEmailSafely } from '../outbox/password-setup-outbox.service.js'
import { enqueueNotificationSafely } from '../outbox/notification-outbox.service.js'
import type { AdminUser } from './admin.types.js'
import {
    assertCursorDate,
    decodeCursor,
    getCursorLimit,
    isCursorPaginationRequested,
    toCursorPage,
} from '../../shared/http/cursor-pagination.js'
import type { CursorPage } from '../../shared/http/cursor-pagination.js'
import type { AdminUsersQuery } from './admin.schemas.js'
import { normalizeAdminSearch } from './admin-query-policy.js'
import { getAdminLegacyListLimit } from './admin-list-policy.js'
import { normalizeAuthEmail } from '../auth/email-policy.js'
import { normalizeAuthUserName } from '../auth/user-input-policy.js'
import { toProviderResponse } from '../autocare/autocare.mappers.js'
import type { AutoCareProviderResponse } from '../autocare/autocare.types.js'

function assertAdmin(user: UserEntity) {
    if (!isAdminRole(user.role)) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only admins can use this endpoint.',
        })
    }
}

function assertSuperAdmin(user: UserEntity) {
    if (!isSuperAdmin(user)) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only super admin can use this endpoint.',
        })
    }
}

export type AdminAutoCareProvider = AutoCareProviderResponse & {
    ownerName: string | null
    trustScore: number
}

export type SuperAdminPlatformOverview = {
    markets: Array<{
        id: string
        countryCode: string
        countryName: string
        cityCode: string
        cityName: string
        currencyCode: string
        launchReady: boolean
        supportedLocales: string[]
    }>
    providers: { total: number; active: number; draft: number; suspended: number; verified: number }
    users: { clients: number; owners: number; admins: number; superAdmins: number }
    billing: { phase: 'launch'; subscriptionsEnabled: false; promoCodesEnabled: false }
}

export function getProviderTrustScore(provider: AutomotiveProviderEntity) {
    if (provider.trustReassessedAt !== null) return Number(provider.trustScore)
    const reviewScore = Math.min(provider.reviewCount, 50) / 2
    const ratingScore = Math.min(Number(provider.rating), 5) * 8
    const experienceScore = Math.min(provider.yearsActive, 10)
    const verificationScore = provider.verified ? 25 : 0
    const publicationScore = provider.status === AutomotiveProviderStatus.Active ? 5 : 0

    return Math.round(Math.min(100, reviewScore + ratingScore + experienceScore + verificationScore + publicationScore))
}

export async function getAdminAutoCareProviders(admin: UserEntity): Promise<AdminAutoCareProvider[]> {
    assertAdmin(admin)
    const providers = await AppDataSource.getRepository(AutomotiveProviderEntity).find({ order: { createdAt: 'DESC' } })
    const locations = providers.length
        ? await AppDataSource.getRepository(AutomotiveServiceLocationEntity).findBy({ providerId: In(providers.map((provider) => provider.id)) })
        : []
    const owners = providers.some((provider) => provider.ownerId)
        ? await AppDataSource.getRepository(UserEntity).findBy({ id: In(providers.flatMap((provider) => provider.ownerId ? [provider.ownerId] : [])) })
        : []
    const locationByProvider = new Map(locations.map((location) => [location.providerId, location]))
    const ownerById = new Map(owners.map((owner) => [owner.id, owner]))

    return providers.flatMap((provider) => {
        const location = locationByProvider.get(provider.id)
        if (!location) return []
        return [{ ...toProviderResponse(provider, location), ownerName: provider.ownerId ? ownerById.get(provider.ownerId)?.name ?? null : null, trustScore: getProviderTrustScore(provider) }]
    })
}

export async function updateAdminAutoCareProviderStatus(admin: UserEntity, providerId: string, status: AutomotiveProviderStatus) {
    assertAdmin(admin)
    const repository = AppDataSource.getRepository(AutomotiveProviderEntity)
    const provider = await repository.findOneBy({ id: providerId })
    if (!provider) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive provider not found.' })
    }
    const oldStatus = provider.status
    provider.status = status
    const saved = await repository.save(provider)
    const location = await AppDataSource.getRepository(AutomotiveServiceLocationEntity).findOneBy({ providerId: saved.id })
    if (!location) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive provider location not found.' })
    }
    const owner = saved.ownerId ? await AppDataSource.getRepository(UserEntity).findOneBy({ id: saved.ownerId }) : null
    return { provider: { ...toProviderResponse(saved, location), ownerName: owner?.name ?? null, trustScore: getProviderTrustScore(saved) }, oldStatus, newStatus: saved.status }
}

export async function getSuperAdminPlatformOverview(actor: UserEntity): Promise<SuperAdminPlatformOverview> {
    assertSuperAdmin(actor)
    const [markets, providers, users] = await Promise.all([
        AppDataSource.getRepository(AutomotiveMarketEntity).find({ order: { countryName: 'ASC', cityName: 'ASC' } }),
        AppDataSource.getRepository(AutomotiveProviderEntity).find(),
        AppDataSource.getRepository(UserEntity).find({ select: { role: true } }),
    ])

    return {
        markets: markets.map((market) => ({ id: market.id, countryCode: market.countryCode, countryName: market.countryName, cityCode: market.cityCode, cityName: market.cityName, currencyCode: market.currencyCode, launchReady: market.launchReady, supportedLocales: market.supportedLocales })),
        providers: {
            total: providers.length,
            active: providers.filter((provider) => provider.status === AutomotiveProviderStatus.Active).length,
            draft: providers.filter((provider) => provider.status === AutomotiveProviderStatus.Draft).length,
            suspended: providers.filter((provider) => provider.status === AutomotiveProviderStatus.Suspended).length,
            verified: providers.filter((provider) => provider.verified).length,
        },
        users: {
            clients: users.filter((user) => user.role === UserRole.Client).length,
            owners: users.filter((user) => user.role === UserRole.Owner).length,
            admins: users.filter((user) => user.role === UserRole.Admin).length,
            superAdmins: users.filter((user) => user.role === UserRole.SuperAdmin).length,
        },
        billing: { phase: 'launch', subscriptionsEnabled: false, promoCodesEnabled: false },
    }
}

export async function getAdminUsers(
    admin: UserEntity,
    input: AdminUsersQuery = {},
): Promise<AdminUser[] | CursorPage<AdminUser>> {
    assertAdmin(admin)

    const userRepository = AppDataSource.getRepository(UserEntity)
    const isPaginated = isCursorPaginationRequested(input)
    const limit = getCursorLimit(input.limit)
    const search = normalizeAdminSearch(input.search)
    const query = userRepository.createQueryBuilder('user')

    if (search) {
        query.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
            search: `%${search}%`,
        })
    }

    if (input.role) {
        query.andWhere('user.role = :role', { role: input.role })
    }

    if (input.status) {
        query.andWhere('user.status = :status', { status: input.status })
    }

    if (input.cursor) {
        const cursor = decodeCursor(input.cursor, ['createdAt', 'id'])
        const cursorCreatedAt = assertCursorDate(cursor, 'createdAt')
        query.andWhere(
            '(user.createdAt < :cursorCreatedAt OR (user.createdAt = :cursorCreatedAt AND user.id < :cursorId))',
            {
                cursorCreatedAt,
                cursorId: cursor.id,
            },
        )
    }

    query.orderBy('user.createdAt', 'DESC').addOrderBy('user.id', 'DESC')

    const users = await query
        .take(isPaginated ? limit + 1 : getAdminLegacyListLimit())
        .getMany()
    const mappedUsers = users.map((user) => toAdminUser(user))

    return isPaginated
        ? toCursorPage(mappedUsers, limit, (user) => ({
            createdAt: user.createdAt.toISOString(),
            id: user.id,
        }))
        : mappedUsers
}

export async function updateAdminUserStatus(
    admin: UserEntity,
    userId: string,
    status: UserStatus
) {
    assertAdmin(admin)

    if (admin.id === userId && status === UserStatus.Blocked) {
        throw new AppError({
            statusCode: 409,
            code: ERROR_CODES.Conflict,
            message: 'Admin cannot block own account.',
        })
    }

    const userRepository = AppDataSource.getRepository(UserEntity)

    const user = await userRepository.findOne({
        where: {
            id: userId,
        },
    })

    if (!user) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'User not found.',
        })
    }

    if (!canManageUserStatus(admin.role, user.role)) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only super admin can manage admin accounts.',
        })
    }

    // Protection: Cannot block the last active super-admin
    if (user.role === UserRole.SuperAdmin && status === UserStatus.Blocked) {
        const activeSuperAdminsCount = await userRepository.count({
            where: {
                role: UserRole.SuperAdmin,
                status: UserStatus.Active,
            },
        })

        if (activeSuperAdminsCount <= 1) {
            throw new AppError({
                statusCode: 400,
                code: ERROR_CODES.BadRequest,
                message: 'Cannot block the last active super administrator.',
            })
        }
    }

    const oldStatus = user.status
    user.status = status

    const savedUser = await userRepository.save(user)

    return {
        user: toAdminUser(savedUser),
        oldStatus,
        newStatus: savedUser.status,
    }
}

export async function updateAdminUserRole(
    admin: UserEntity,
    userId: string,
    role: UserRole
) {
    assertAdmin(admin)

    if (!isSuperAdmin(admin)) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only super admin can change user roles.',
        })
    }

    const userRepository = AppDataSource.getRepository(UserEntity)

    const user = await userRepository.findOne({
        where: { id: userId },
    })

    if (!user) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'User not found.',
        })
    }

    // Protection: Cannot demote the last active super-admin
    if (user.role === UserRole.SuperAdmin && role !== UserRole.SuperAdmin) {
        const activeSuperAdminsCount = await userRepository.count({
            where: {
                role: UserRole.SuperAdmin,
                status: UserStatus.Active,
            },
        })

        if (activeSuperAdminsCount <= 1) {
            throw new AppError({
                statusCode: 400,
                code: ERROR_CODES.BadRequest,
                message: 'Cannot demote the last active super administrator.',
            })
        }
    }

    const oldRole = user.role
    user.role = role
    user.tokenVersion += 1 // Invalidate sessions on role change

    const savedUser = await userRepository.save(user)

    return {
        user: toAdminUser(savedUser),
        oldRole,
        newRole: savedUser.role,
    }
}

export async function getAdminCabinets(admin: UserEntity) {
    assertAdmin(admin)

    const cabinetRepository = AppDataSource.getRepository(CabinetEntity)

    const cabinets = await cabinetRepository
        .createQueryBuilder('cabinet')
        .leftJoinAndSelect('cabinet.owner', 'owner')
        .orderBy('cabinet.createdAt', 'DESC')
        .take(getAdminLegacyListLimit())
        .getMany()

    return cabinets.map(toAdminCabinet)
}

export async function updateAdminCabinetStatus(
    admin: UserEntity,
    cabinetId: string,
    status: CabinetStatus
) {
    assertAdmin(admin)

    const cabinetRepository = AppDataSource.getRepository(CabinetEntity)

    const cabinet = await cabinetRepository
        .createQueryBuilder('cabinet')
        .leftJoinAndSelect('cabinet.owner', 'owner')
        .where('cabinet.id = :cabinetId', { cabinetId })
        .getOne()

    if (!cabinet) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Cabinet not found.',
        })
    }

    const oldStatus = cabinet.status
    cabinet.status = status

    const savedCabinet = await cabinetRepository.save(cabinet)

    if (oldStatus !== savedCabinet.status && cabinet.owner) {
        await enqueueNotificationSafely({
            userId: cabinet.owner.id,
            category: NotificationCategory.Moderation,
            title: 'Cabinet status updated',
            message: `Your cabinet "${cabinet.title}" is now ${savedCabinet.status}.`,
            link: '/owner/cabinets',
            metadata: {
                cabinetId: savedCabinet.id,
                cabinetTitle: cabinet.title,
                previousStatus: oldStatus,
                status: savedCabinet.status,
            },
        }, `notification:cabinet:${savedCabinet.id}:status:${savedCabinet.status}:${cabinet.owner.id}`)
    }

    const updatedCabinet = await cabinetRepository
        .createQueryBuilder('cabinet')
        .leftJoinAndSelect('cabinet.owner', 'owner')
        .where('cabinet.id = :cabinetId', {
            cabinetId: savedCabinet.id,
        })
        .getOne()

    if (!updatedCabinet) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Cabinet not found.',
        })
    }

    return {
        cabinet: toAdminCabinet(updatedCabinet),
        oldStatus,
        newStatus: updatedCabinet.status,
    }
}

type CreateAdminInput = {
    name: string
    email: string
}

export async function createAdmin(
    actor: UserEntity,
    input: CreateAdminInput,
    frontendOrigin: string,
    locale?: SupportedLocale
) {
    if (!isSuperAdmin(actor)) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only super admin can create other admins.',
        })
    }

    const userRepository = AppDataSource.getRepository(UserEntity)
    const email = normalizeAuthEmail(input.email)
    const name = normalizeAuthUserName(input.name)

    const existingUser = await userRepository.findOne({
        where: { email },
    })

    if (existingUser) {
        throw new AppError({
            statusCode: 409,
            code: ERROR_CODES.Conflict,
            message: 'User with this email already exists.',
        })
    }

    const user = userRepository.create({
        name,
        email,
        passwordHash: null,
        phone: null,
        role: UserRole.Admin,
        status: UserStatus.Active,
        avatarUrl: null,
        provider: UserProvider.Email,
        emailVerifiedAt: new Date(), // Admins created by super-admin are pre-verified
    })

    const savedUser = await userRepository.save(user)
    const setupToken = await createPasswordSetupTokenForUser(savedUser)

    await enqueuePasswordSetupEmailSafely({
        email: savedUser.email,
        expiresAt: setupToken.expiresAt,
        frontendOrigin,
        token: setupToken.token,
        locale,
    }).catch((error) => {
        logError('Failed to enqueue admin password setup email', error, {
            operation: 'admin-password-setup-email',
        })
    })

    return {
        user: toAdminUser(savedUser),
        passwordSetupToken: setupToken.token,
        passwordSetupExpiresAt: setupToken.expiresAt.toISOString(),
    }
}
