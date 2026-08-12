import { AppDataSource } from '../../database/data-source.js'
import {
    CabinetEntity,
    CabinetStatus,
} from '../../entities/cabinet/cabinet.entity.js'
import { BookingEntity } from '../../entities/booking/booking.entity.js'
import { BookingPaymentEntity, BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import { BookingPaymentRefundEntity } from '../../entities/booking/booking-payment-refund.entity.js'
import {
    BookingPaymentDisputeEntity,
    BookingPaymentDisputeStatus,
} from '../../entities/booking/booking-payment-dispute.entity.js'
import { ServiceEntity } from '../../entities/service/service.entity.js'
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
import type { AdminPayment, AdminPaymentDispute, AdminPaymentRefund, AdminUser } from './admin.types.js'
import {
    assertCursorDate,
    decodeCursor,
    getCursorLimit,
    isCursorPaginationRequested,
    toCursorPage,
} from '../../shared/http/cursor-pagination.js'
import type { CursorPage } from '../../shared/http/cursor-pagination.js'
import type { AdminPaymentsQuery, AdminUsersQuery } from './admin.schemas.js'
import { normalizeAdminSearch } from './admin-query-policy.js'
import { getAdminLegacyListLimit } from './admin-list-policy.js'
import { normalizeAuthEmail } from '../auth/email-policy.js'
import { normalizeAuthUserName } from '../auth/user-input-policy.js'
import { getRemainingPaymentAmountMinor } from '../payments/payment-money.js'

export type AdminPaymentAttention = {
    failedPaymentCount: number
    openDisputeCount: number
    fundsWithdrawnDisputeCount: number
}

function assertAdmin(user: UserEntity) {
    if (!isAdminRole(user.role)) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only admins can use this endpoint.',
        })
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

type AdminPaymentRow = {
    id: string
    bookingId: string
    clientId: string
    clientName: string
    clientEmail: string
    ownerId: string
    ownerName: string
    ownerEmail: string
    cabinetTitle: string
    serviceTitle: string
    date: string
    startTime: string
    endTime: string
    grossAmount: string | number
    refundedAmountMinor: string | number
    commissionAmount: string | number
    ownerPayoutAmount: string | number
    currency: string
    status: BookingPaymentStatus
    stripeSessionId: string | null
    stripePaymentIntentId: string | null
    createdAt: Date | string
}

export async function getAdminPayments(
    admin: UserEntity,
    input: AdminPaymentsQuery = {},
): Promise<AdminPayment[] | CursorPage<AdminPayment>> {
    assertAdmin(admin)

    const isPaginated = isCursorPaginationRequested(input)
    const limit = getCursorLimit(input.limit)
    const search = normalizeAdminSearch(input.search)
    const query = AppDataSource.getRepository(BookingPaymentEntity)
        .createQueryBuilder('payment')
        .innerJoin(BookingEntity, 'booking', 'booking.id = payment.bookingId')
        .innerJoin(UserEntity, 'client', 'client.id = booking.clientId')
        .innerJoin(CabinetEntity, 'cabinet', 'cabinet.id = booking.cabinetId')
        .innerJoin(UserEntity, 'owner', 'owner.id = cabinet.ownerId')
        .innerJoin(ServiceEntity, 'service', 'service.id = booking.serviceId')
        .select('payment.id', 'id')
        .addSelect('payment.bookingId', 'bookingId')
        .addSelect('client.id', 'clientId')
        .addSelect('client.name', 'clientName')
        .addSelect('client.email', 'clientEmail')
        .addSelect('owner.id', 'ownerId')
        .addSelect('owner.name', 'ownerName')
        .addSelect('owner.email', 'ownerEmail')
        .addSelect('cabinet.title', 'cabinetTitle')
        .addSelect('service.title', 'serviceTitle')
        .addSelect('booking.date', 'date')
        .addSelect('booking.startTime', 'startTime')
        .addSelect('booking.endTime', 'endTime')
        .addSelect('payment.grossAmount', 'grossAmount')
        .addSelect('payment.refundedAmountMinor', 'refundedAmountMinor')
        .addSelect('payment.commissionAmount', 'commissionAmount')
        .addSelect('payment.ownerPayoutAmount', 'ownerPayoutAmount')
        .addSelect('payment.currency', 'currency')
        .addSelect('payment.status', 'status')
        .addSelect('payment.stripeSessionId', 'stripeSessionId')
        .addSelect('payment.stripePaymentIntentId', 'stripePaymentIntentId')
        .addSelect('payment.createdAt', 'createdAt')

    if (input.status) {
        query.andWhere('payment.status = :paymentStatus', {
            paymentStatus: input.status,
        })
    }

    if (search) {
        query.andWhere(
            '(client.name ILIKE :search OR client.email ILIKE :search OR owner.name ILIKE :search OR owner.email ILIKE :search OR cabinet.title ILIKE :search OR service.title ILIKE :search)',
            { search: `%${search}%` },
        )
    }

    if (input.cursor) {
        const cursor = decodeCursor(input.cursor, ['createdAt', 'id'])
        const cursorCreatedAt = assertCursorDate(cursor, 'createdAt')
        query.andWhere(
            '(payment.createdAt < :cursorCreatedAt OR (payment.createdAt = :cursorCreatedAt AND payment.id < :cursorId))',
            {
                cursorCreatedAt,
                cursorId: cursor.id,
            },
        )
    }

    const rows = await query
        .orderBy('payment.createdAt', 'DESC')
        .addOrderBy('payment.id', 'DESC')
        .take(isPaginated ? limit + 1 : 200)
        .getRawMany<AdminPaymentRow>()

    const payments = rows.map((row) => ({
        id: row.id,
        bookingId: row.bookingId,
        client: {
            id: row.clientId,
            name: row.clientName,
            email: row.clientEmail,
        },
        owner: {
            id: row.ownerId,
            name: row.ownerName,
            email: row.ownerEmail,
        },
        cabinetTitle: row.cabinetTitle,
        serviceTitle: row.serviceTitle,
        date: row.date,
        startTime: row.startTime,
        endTime: row.endTime,
        grossAmount: Number(row.grossAmount),
        refundedAmountMinor: Number(row.refundedAmountMinor),
        remainingAmountMinor: getRemainingPaymentAmountMinor(
            Number(row.grossAmount),
            Number(row.refundedAmountMinor),
        ),
        commissionAmount: Number(row.commissionAmount),
        ownerPayoutAmount: Number(row.ownerPayoutAmount),
        currency: row.currency,
        status: row.status,
        stripeSessionId: row.stripeSessionId,
        stripePaymentIntentId: row.stripePaymentIntentId,
        createdAt: new Date(row.createdAt),
    }))

    return isPaginated
        ? toCursorPage(payments, limit, (payment) => ({
            createdAt: payment.createdAt.toISOString(),
            id: payment.id,
        }))
        : payments
}

export async function getAdminPaymentAttention(
    admin: UserEntity,
): Promise<AdminPaymentAttention> {
    if (!isSuperAdmin(admin)) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only super admins can view payment attention.',
        })
    }

    const paymentRepository = AppDataSource.getRepository(BookingPaymentEntity)
    const disputeRepository = AppDataSource.getRepository(BookingPaymentDisputeEntity)
    const [failedPaymentCount, openDisputeCount, fundsWithdrawnDisputeCount] = await Promise.all([
        paymentRepository.countBy({ status: BookingPaymentStatus.Failed }),
        disputeRepository.countBy({ status: BookingPaymentDisputeStatus.Open }),
        disputeRepository.countBy({ status: BookingPaymentDisputeStatus.FundsWithdrawn }),
    ])

    return {
        failedPaymentCount,
        openDisputeCount,
        fundsWithdrawnDisputeCount,
    }
}

export async function getAdminPaymentRefunds(
    admin: UserEntity,
    paymentId: string,
): Promise<AdminPaymentRefund[]> {
    assertAdmin(admin)

    const payment = await AppDataSource.getRepository(BookingPaymentEntity).findOne({
        where: { id: paymentId },
        select: { id: true },
    })
    if (!payment) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Payment not found.',
        })
    }

    const refunds = await AppDataSource.getRepository(BookingPaymentRefundEntity).find({
        where: { paymentId },
        order: { createdAt: 'ASC', id: 'ASC' },
        take: 100,
    })

    return refunds.map((refund) => ({
        id: refund.id,
        paymentId: refund.paymentId,
        bookingId: refund.bookingId,
        providerRefundId: refund.providerRefundId,
        providerChargeId: refund.providerChargeId,
        amountMinor: refund.amountMinor,
        currency: refund.currency,
        reason: refund.reason,
        status: refund.status,
        createdAt: refund.createdAt,
        updatedAt: refund.updatedAt,
    }))
}

export async function getAdminPaymentDisputes(
    admin: UserEntity,
    paymentId: string,
): Promise<AdminPaymentDispute[]> {
    assertAdmin(admin)

    const payment = await AppDataSource.getRepository(BookingPaymentEntity).findOne({
        where: { id: paymentId },
        select: { id: true },
    })
    if (!payment) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Payment not found.',
        })
    }

    const disputes = await AppDataSource.getRepository(BookingPaymentDisputeEntity).find({
        where: { paymentId },
        order: { lastEventCreatedAt: 'ASC', id: 'ASC' },
        take: 100,
    })

    return disputes.map((dispute) => ({
        id: dispute.id,
        paymentId: dispute.paymentId,
        bookingId: dispute.bookingId,
        providerDisputeId: dispute.providerDisputeId,
        providerChargeId: dispute.providerChargeId,
        amountMinor: dispute.amountMinor,
        currency: dispute.currency,
        reason: dispute.reason,
        providerStatus: dispute.providerStatus,
        status: dispute.status,
        lastEventId: dispute.lastEventId,
        lastEventCreatedAt: dispute.lastEventCreatedAt,
        createdAt: dispute.createdAt,
        updatedAt: dispute.updatedAt,
    }))
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
