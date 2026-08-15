import { In } from 'typeorm'
import type {
    EntityManager,
    QueryFailedError,
    Repository,
    SelectQueryBuilder,
} from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import {
    BookingEntity,
    BookingStatus,
} from '../../entities/booking/booking.entity.js'
import { BookingStatusHistoryEntity } from '../../entities/booking/booking-status-history.entity.js'
import {
    BookingRescheduleRequestEntity,
    BookingRescheduleStatus,
} from '../../entities/booking/booking-reschedule-request.entity.js'
import {
    CabinetEntity,
    CabinetStatus,
} from '../../entities/cabinet/cabinet.entity.js'
import { ServiceEntity } from '../../entities/service/service.entity.js'
import { CabinetScheduleEntity } from '../../entities/cabinet/cabinet-schedule.entity.js'
import { CabinetScheduleExceptionEntity } from '../../entities/cabinet/cabinet-schedule-exception.entity.js'
import { CabinetBlockedPeriodEntity } from '../../entities/cabinet/cabinet-blocked-period.entity.js'
import {
    UserEntity,
    UserRole,
    UserStatus,
} from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import {
    toClientBooking,
    toOwnerBooking,
    toPublicBooking,
} from './bookings.mappers.js'
import type { ClientBooking, OwnerBooking } from './bookings.types.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { enqueueBookingEmail } from '../outbox/booking-email-outbox.service.js'
import { shouldDeliverNotification } from '../notifications/notification-preferences.js'
import { enqueueNotification } from '../outbox/notification-outbox.service.js'
import { getWeekday, getZonedDateTime } from '../../shared/date-time/cabinet-timezone.js'
import { isTimeRangeBlocked } from '../cabinets/cabinet-blocked-period.js'
import type { BookingListQuery } from './bookings.schemas.js'
import {
    decodeCursor,
    getCursorLimit,
    isCursorPaginationRequested,
    toCursorPage,
} from '../../shared/http/cursor-pagination.js'
import type { CursorPage } from '../../shared/http/cursor-pagination.js'
import {
    assertBookingDateRange,
    normalizeBookingComment,
    normalizeBookingCancellationReason,
    normalizeBookingIdempotencyKey,
    normalizeBookingOwnerNote,
} from './booking-input-policy.js'
import { assertBookingTimeRange } from './booking-time-policy.js'
import { assertBookingRescheduleDecision } from './booking-reschedule-policy.js'
import {
    DAY_IN_MILLISECONDS,
    recordOwnerActionCenterClick,
    recordOwnerActionQueueSnapshot,
    recordOwnerBookingDecision,
    recordOwnerRescheduleDecision,
} from './owner-action-metrics.js'
import {
    recordClientExperimentCompletion,
    recordClientExperimentEvent,
    type ClientExperimentEventName,
} from './client-experiment-metrics.js'
import { assertBookAgainSource } from './book-again-policy.js'

type CreateBookingInput = {
    cabinetId: string
    serviceId: string
    date: string
    startTime: string
    endTime: string
    comment?: string
    idempotencyKey?: string
    experiment?: 'book_again'
    sourceBookingId?: string
}

type OwnerCreateBookingInput = CreateBookingInput & {
    clientId: string
}

type RequestBookingRescheduleInput = Pick<
    CreateBookingInput,
    'date' | 'startTime' | 'endTime'
>

type ResolveBookingRescheduleInput = {
    decision: 'accepted' | 'rejected'
    reason?: string
}

const activeBookingStatuses = [
    BookingStatus.Pending,
    BookingStatus.Confirmed,
]

function isBookingSlotContentionError(error: unknown) {
    const driverError = (error as QueryFailedError | undefined)?.driverError as
        | { code?: unknown; constraint?: unknown; where?: unknown }
        | undefined

    const isOverlap = driverError?.code === '23P01' &&
        driverError.constraint === 'EXCL_bookings_active_time_overlap'
    const isExclusionDeadlock = driverError?.code === '40P01' &&
        typeof driverError.where === 'string' &&
        driverError.where.includes('exclusion constraint')

    return isOverlap || isExclusionDeadlock
}

function isBookingIdempotencyUniqueError(error: unknown) {
    const driverError = (error as QueryFailedError | undefined)?.driverError as
        | { code?: unknown; constraint?: unknown }
        | undefined

    return driverError?.code === '23505' &&
        driverError.constraint === 'IDX_bookings_client_idempotency_key'
}

function isSameBookingRequest(
    booking: BookingEntity,
    input: CreateBookingInput,
    comment: string | null,
) {
    return booking.cabinetId === input.cabinetId &&
        booking.serviceId === input.serviceId &&
        booking.date === input.date &&
        booking.startTime.slice(0, 5) === input.startTime &&
        booking.endTime.slice(0, 5) === input.endTime &&
        booking.comment === comment
}

function idempotencyConflictError() {
    return new AppError({
        statusCode: 409,
        code: ERROR_CODES.Conflict,
        message: 'Idempotency key was already used for another booking request.',
    })
}

async function saveNewBooking(
    bookingRepository: Repository<BookingEntity>,
    booking: BookingEntity
) {
    try {
        return await bookingRepository.save(booking)
    } catch (error) {
        if (isBookingSlotContentionError(error)) {
            if (booking.idempotencyKey) throw error

            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.Conflict,
                message: 'Selected time slot was just booked by another client.',
            })
        }

        throw error
    }
}

function toBookingRescheduleRequest(request: BookingRescheduleRequestEntity) {
    return {
        id: request.id,
        bookingId: request.bookingId,
        proposedDate: request.proposedDate,
        proposedStartTime: request.proposedStartTime.slice(0, 5),
        proposedEndTime: request.proposedEndTime.slice(0, 5),
        status: request.status,
        resolutionReason: request.resolutionReason,
        createdAt: request.createdAt,
        resolvedAt: request.resolvedAt,
    }
}

async function recordBookingStatus(
    bookingId: string,
    status: BookingStatus,
    changedById: string | null,
    reason: string | null = null,
    manager: EntityManager = AppDataSource.manager,
) {
    await manager.getRepository(BookingStatusHistoryEntity).save({
        bookingId,
        status,
        changedById,
        reason,
    })
}

export async function getBookingStatusHistory(user: UserEntity, bookingId: string) {
    const booking = await AppDataSource.getRepository(BookingEntity).findOne({
        where: { id: bookingId },
        relations: { cabinet: true },
    })

    if (!booking || (booking.clientId !== user.id && booking.cabinet.ownerId !== user.id)) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Booking not found.' })
    }

    return AppDataSource.getRepository(BookingStatusHistoryEntity).find({
        where: { bookingId },
        order: { createdAt: 'ASC' },
    })
}

function assertClient(user: UserEntity) {
    if (user.role !== UserRole.Client) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only clients can use this booking endpoint.',
        })
    }
}

function assertOwner(user: UserEntity) {
    if (user.role !== UserRole.Owner) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only owners can use this booking endpoint.',
        })
    }
}

async function assertClientExists(clientId: string) {
    const userRepository = AppDataSource.getRepository(UserEntity)

    const client = await userRepository.findOne({
        where: {
            id: clientId,
            role: UserRole.Client,
            status: UserStatus.Active,
        },
    })

    if (!client) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Client not found.',
        })
    }
}

async function assertCabinetAndServiceAreBookable(
    cabinetId: string,
    serviceId: string,
    ownerId?: string
) {
    const cabinetRepository = AppDataSource.getRepository(CabinetEntity)
    const serviceRepository = AppDataSource.getRepository(ServiceEntity)

    const cabinet = await cabinetRepository.findOne({
        where: {
            id: cabinetId,
            status: CabinetStatus.Active,
            ...(ownerId ? { ownerId } : {}),
        },
    })

    if (!cabinet) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Cabinet not found.',
        })
    }

    const service = await serviceRepository.findOne({
        where: {
            id: serviceId,
            cabinetId,
            isActive: true,
        },
    })

    if (!service) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Service not found.',
        })
    }
}

function isActiveBookingStatus(status: BookingStatus) {
    return activeBookingStatuses.includes(status)
}

async function assertBookingSlotIsAvailable(
    input: CreateBookingInput,
    excludeBookingId?: string
) {
    const bookingRepository = AppDataSource.getRepository(BookingEntity)
    const { startMinutes, endMinutes } = assertBookingTimeRange(input.startTime, input.endTime)

    const query = bookingRepository
        .createQueryBuilder('booking')
        .where('booking.cabinetId = :cabinetId', {
            cabinetId: input.cabinetId,
        })
        .andWhere('booking.date = :date', {
            date: input.date,
        })
        .andWhere('booking.status IN (:...statuses)', {
            statuses: activeBookingStatuses,
        })
        .andWhere('booking.startTime < :endTime', {
            endTime: input.endTime,
        })
        .andWhere('booking.endTime > :startTime', {
            startTime: input.startTime,
        })

    if (excludeBookingId) {
        query.andWhere('booking.id != :excludeBookingId', {
            excludeBookingId,
        })
    }

    const overlappingBooking = await query.getOne()

    if (overlappingBooking) {
        throw new AppError({
            statusCode: 409,
            code: ERROR_CODES.Conflict,
            message: 'Selected time slot is already booked.',
        })
    }

    const service = await AppDataSource.getRepository(ServiceEntity).findOne({
        where: {
            id: input.serviceId,
            cabinetId: input.cabinetId,
            isActive: true,
        },
    })
    const cabinet = await AppDataSource.getRepository(CabinetEntity).findOneByOrFail({ id: input.cabinetId })
    const zonedNow = getZonedDateTime(cabinet.timezone)
    const weekday = getWeekday(input.date)
    const schedule = await AppDataSource.getRepository(CabinetScheduleEntity).findOneBy({
        cabinetId: input.cabinetId,
        weekday,
    })
    const exception = await AppDataSource.getRepository(CabinetScheduleExceptionEntity).findOneBy({
        cabinetId: input.cabinetId,
        date: input.date,
    })
    const blockedPeriods = await AppDataSource.getRepository(CabinetBlockedPeriodEntity).findBy({
        cabinetId: input.cabinetId,
        date: input.date,
    })
    const exceptionTimes = exception?.openTime && exception.closeTime
        ? assertBookingTimeRange(exception.openTime, exception.closeTime)
        : undefined
    const scheduleTimes = schedule
        ? assertBookingTimeRange(schedule.openTime, schedule.closeTime)
        : undefined
    const openMinutes = exceptionTimes?.startMinutes ?? scheduleTimes?.startMinutes ?? 8 * 60
    const closeMinutes = exceptionTimes?.endMinutes ?? scheduleTimes?.endMinutes ?? 22 * 60

    if (
        !service ||
        endMinutes - startMinutes !== service.durationMinutes ||
        schedule?.isOpen === false || exception?.isClosed === true ||
        isTimeRangeBlocked(input.startTime, input.endTime, blockedPeriods) ||
        startMinutes < openMinutes ||
        endMinutes > closeMinutes ||
        startMinutes % 30 !== 0 ||
        (input.date === zonedNow.date && startMinutes <= zonedNow.minutes) ||
        input.date < zonedNow.date
    ) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.ValidationError,
            message: 'Selected time slot does not match the service availability rules.',
        })
    }
}

async function getOwnerBookingEntityById(
    ownerId: string,
    bookingId: string,
    manager: EntityManager = AppDataSource.manager,
) {
    const bookingRepository = manager.getRepository(BookingEntity)

    const booking = await bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.client', 'client')
        .leftJoinAndSelect('booking.cabinet', 'cabinet')
        .leftJoinAndSelect('booking.service', 'service')
        .where('booking.id = :bookingId', { bookingId })
        .andWhere('cabinet.ownerId = :ownerId', { ownerId })
        .getOne()

    if (!booking) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Booking not found.',
        })
    }

    return booking
}

function bookingNotificationMetadata(booking: BookingEntity) {
    return {
        bookingId: booking.id,
        cabinetId: booking.cabinetId,
        cabinetTitle: booking.cabinet.title,
        date: booking.date,
        endTime: booking.endTime,
        serviceId: booking.serviceId,
        serviceTitle: booking.service.title,
        startTime: booking.startTime,
        status: booking.status,
    }
}

function bookingNotificationKey(
    bookingId: string,
    event: string,
    userId: string,
    relatedId = 'booking',
) {
    return `notification:booking:${bookingId}:${event}:${relatedId}:${userId}`
}

async function createBookingNotification(
    input: Parameters<typeof enqueueNotification>[0],
    idempotencyKey: string,
    manager: EntityManager,
) {
    await enqueueNotification(input, idempotencyKey, manager)
}

async function notifyBookingCreated(
    fullBooking: BookingEntity,
    owner: UserEntity | null | undefined,
    manager: EntityManager,
) {
    if (owner) {
        await createBookingNotification({
            userId: owner.id,
            category: NotificationCategory.Booking,
            template: {
                key: 'booking.created.owner',
                params: {
                    clientName: fullBooking.client.name,
                    serviceTitle: fullBooking.service.title,
                    cabinetTitle: fullBooking.cabinet.title,
                    date: fullBooking.date,
                    startTime: fullBooking.startTime,
                },
            },
            metadata: bookingNotificationMetadata(fullBooking),
        }, bookingNotificationKey(fullBooking.id, 'created', owner.id), manager)
    }

    await createBookingNotification({
        userId: fullBooking.clientId,
        category: NotificationCategory.Booking,
        template: {
            key: 'booking.created.client',
            params: {
                serviceTitle: fullBooking.service.title,
                cabinetTitle: fullBooking.cabinet.title,
            },
        },
        metadata: bookingNotificationMetadata(fullBooking),
    }, bookingNotificationKey(fullBooking.id, 'created', fullBooking.clientId), manager)
}

async function notifyOwnerCreatedBooking(ownerBooking: BookingEntity, manager: EntityManager) {
    await createBookingNotification({
        userId: ownerBooking.clientId,
        category: NotificationCategory.Booking,
        template: {
            key: 'booking.confirmed.client',
            params: {
                cabinetTitle: ownerBooking.cabinet.title,
                serviceTitle: ownerBooking.service.title,
                date: ownerBooking.date,
                startTime: ownerBooking.startTime,
            },
        },
        metadata: bookingNotificationMetadata(ownerBooking),
    }, bookingNotificationKey(ownerBooking.id, 'confirmed', ownerBooking.clientId), manager)
}

async function notifyClientCancelledBooking(
    booking: BookingEntity,
    client: UserEntity,
    owner: UserEntity | null | undefined,
    manager: EntityManager,
) {
    if (owner) {
        await createBookingNotification({
            userId: owner.id,
            category: NotificationCategory.Booking,
            template: {
                key: 'booking.cancelled.owner',
                params: {
                    clientName: client.name,
                    serviceTitle: booking.service.title,
                    cabinetTitle: booking.cabinet.title,
                    date: booking.date,
                },
            },
            metadata: bookingNotificationMetadata(booking),
        }, bookingNotificationKey(booking.id, 'cancelled', owner.id), manager)
    }

    await createBookingNotification({
        userId: booking.clientId,
        category: NotificationCategory.Booking,
        template: {
            key: 'booking.cancelled.client',
            params: {
                cabinetTitle: booking.cabinet.title,
                date: booking.date,
            },
        },
        metadata: bookingNotificationMetadata(booking),
    }, bookingNotificationKey(booking.id, 'cancelled', booking.clientId), manager)
}

async function notifyBookingStatusChanged(
    booking: BookingEntity,
    previousStatus: BookingStatus,
    manager: EntityManager,
) {
    if (previousStatus === booking.status) {
        return
    }

    const statusTemplateByStatus: Record<BookingStatus, {
        key: 'booking.status.pending' | 'booking.status.confirmed' | 'booking.status.cancelled' | 'booking.status.completed'
        params: Record<string, string>
    }> = {
        [BookingStatus.Pending]: {
            key: 'booking.status.pending',
            params: { cabinetTitle: booking.cabinet.title },
        },
        [BookingStatus.Confirmed]: {
            key: 'booking.status.confirmed',
            params: {
                cabinetTitle: booking.cabinet.title,
                date: booking.date,
                startTime: booking.startTime,
            },
        },
        [BookingStatus.Cancelled]: {
            key: 'booking.status.cancelled',
            params: { cabinetTitle: booking.cabinet.title },
        },
        [BookingStatus.Completed]: {
            key: 'booking.status.completed',
            params: { cabinetTitle: booking.cabinet.title },
        },
    }
    const statusTemplate = statusTemplateByStatus[booking.status]

    await createBookingNotification({
        userId: booking.clientId,
        category: NotificationCategory.Booking,
        template: statusTemplate,
        metadata: {
            ...bookingNotificationMetadata(booking),
            previousStatus,
        },
    }, bookingNotificationKey(booking.id, `status-${booking.status}`, booking.clientId), manager)
}

export async function createClientBooking(
    client: UserEntity,
    input: CreateBookingInput,
    frontendOrigin: string
) {
    assertClient(client)
    const comment = normalizeBookingComment(input.comment)
    const idempotencyKey = normalizeBookingIdempotencyKey(input.idempotencyKey)

    const bookingRepository = AppDataSource.getRepository(BookingEntity)
    if (idempotencyKey) {
        const existingBooking = await bookingRepository.findOneBy({
            clientId: client.id,
            idempotencyKey,
        })

        if (existingBooking) {
            if (!isSameBookingRequest(existingBooking, input, comment)) {
                throw idempotencyConflictError()
            }

            return toPublicBooking(existingBooking)
        }
    }

    await assertCabinetAndServiceAreBookable(input.cabinetId, input.serviceId)

    if (input.experiment === 'book_again') {
        const sourceBooking = input.sourceBookingId
            ? await bookingRepository.findOne({
                where: { id: input.sourceBookingId, clientId: client.id },
                select: ['status', 'cabinetId', 'serviceId'],
            })
            : null

        assertBookAgainSource({
            ...input,
            sourceStatus: sourceBooking?.status,
            sourceCabinetId: sourceBooking?.cabinetId,
            sourceServiceId: sourceBooking?.serviceId,
        })
    }

    await assertBookingSlotIsAvailable(input)

    const booking = bookingRepository.create({
        clientId: client.id,
        cabinetId: input.cabinetId,
        serviceId: input.serviceId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        status: BookingStatus.Pending,
        comment,
        idempotencyKey: idempotencyKey ?? null,
    })

    let savedBooking: BookingEntity
    try {
        savedBooking = await AppDataSource.transaction(async (manager) => {
        const saved = await saveNewBooking(manager.getRepository(BookingEntity), booking)
        await recordBookingStatus(saved.id, saved.status, client.id, null, manager)

        const fullBooking = await getOwnerBookingEntityById(
            (await manager.getRepository(CabinetEntity).findOne({ where: { id: input.cabinetId } }))!.ownerId,
            saved.id,
            manager,
        )
        const owner = await manager.getRepository(UserEntity).findOne({
            where: { id: fullBooking.cabinet.ownerId },
        })

        await notifyBookingCreated(fullBooking, owner, manager)

        if (owner && shouldDeliverNotification(NotificationCategory.Booking, owner, 'email')) {
            await enqueueBookingEmail(fullBooking.id, {
                toEmail: owner.email,
                recipientName: owner.name,
                bookingDetails: {
                    date: input.date,
                    startTime: input.startTime,
                    endTime: input.endTime,
                    cabinetTitle: fullBooking.cabinet.title,
                    serviceTitle: fullBooking.service.title,
                },
                status: 'created',
                isForOwner: true,
                frontendOrigin,
                locale: owner.locale ?? undefined,
            }, manager)
        }

        if (shouldDeliverNotification(NotificationCategory.Booking, client, 'email')) {
            await enqueueBookingEmail(fullBooking.id, {
                toEmail: client.email,
                recipientName: client.name,
                bookingDetails: {
                    date: input.date,
                    startTime: input.startTime,
                    endTime: input.endTime,
                    cabinetTitle: fullBooking.cabinet.title,
                    serviceTitle: fullBooking.service.title,
                },
                status: 'created',
                isForOwner: false,
                frontendOrigin,
                locale: client.locale ?? undefined,
            }, manager)
        }

        return saved
        })
    } catch (error) {
        if (!idempotencyKey) throw error
        if (!isBookingSlotContentionError(error) && !isBookingIdempotencyUniqueError(error)) {
            throw error
        }

        const existingBooking = await bookingRepository.findOneBy({
            clientId: client.id,
            idempotencyKey,
        })

        if (existingBooking && isSameBookingRequest(existingBooking, input, comment)) {
            return toPublicBooking(existingBooking)
        }

        if (existingBooking) throw idempotencyConflictError()

        throw new AppError({
            statusCode: 409,
            code: ERROR_CODES.Conflict,
            message: 'Selected time slot was just booked by another client.',
        })
    }

    recordClientExperimentCompletion(input.experiment)

    return toPublicBooking(savedBooking)
}

export async function requestClientBookingReschedule(
    client: UserEntity,
    bookingId: string,
    input: RequestBookingRescheduleInput
) {
    assertClient(client)

    const bookingRepository = AppDataSource.getRepository(BookingEntity)
    const booking = await bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.cabinet', 'cabinet')
        .leftJoinAndSelect('booking.service', 'service')
        .where('booking.id = :bookingId', { bookingId })
        .andWhere('booking.clientId = :clientId', { clientId: client.id })
        .getOne()

    if (!booking) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Booking not found.' })
    }

    if (![BookingStatus.Pending, BookingStatus.Confirmed].includes(booking.status)) {
        throw new AppError({
            statusCode: 409,
            code: ERROR_CODES.Conflict,
            message: 'Only active bookings can be rescheduled.',
        })
    }

    await assertBookingSlotIsAvailable({
        cabinetId: booking.cabinetId,
        serviceId: booking.serviceId,
        ...input,
    }, booking.id)

    const rescheduleRequest = await AppDataSource.transaction(async (manager) => {
        const requestRepository = manager.getRepository(BookingRescheduleRequestEntity)
        const existingRequest = await requestRepository.findOne({
            where: {
                bookingId,
                status: BookingRescheduleStatus.Pending,
            },
            lock: { mode: 'pessimistic_write' },
        })

        if (existingRequest) {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.Conflict,
                message: 'This booking already has a pending reschedule request.',
            })
        }

        const request = await requestRepository.save(requestRepository.create({
            bookingId,
            requestedById: client.id,
            proposedDate: input.date,
            proposedStartTime: input.startTime,
            proposedEndTime: input.endTime,
            status: BookingRescheduleStatus.Pending,
            resolvedById: null,
            resolutionReason: null,
            resolvedAt: null,
        }))

        await createBookingNotification({
            userId: booking.cabinet.ownerId,
            category: NotificationCategory.Booking,
            template: {
                key: 'booking.reschedule.requested.owner',
                params: {
                    clientName: client.name,
                    date: input.date,
                    startTime: input.startTime,
                    cabinetTitle: booking.cabinet.title,
                },
            },
            metadata: { bookingId, rescheduleRequestId: request.id },
        }, bookingNotificationKey(bookingId, 'reschedule-requested', booking.cabinet.ownerId, request.id), manager)

        await createBookingNotification({
            userId: client.id,
            category: NotificationCategory.Booking,
            template: {
                key: 'booking.reschedule.requested.client',
                params: {
                    date: input.date,
                    startTime: input.startTime,
                },
            },
            metadata: { bookingId, rescheduleRequestId: request.id },
        }, bookingNotificationKey(bookingId, 'reschedule-requested', client.id, request.id), manager)

        return request
    })

    return toBookingRescheduleRequest(rescheduleRequest)
}

export async function resolveOwnerBookingReschedule(
    owner: UserEntity,
    bookingId: string,
    input: ResolveBookingRescheduleInput
) {
    assertOwner(owner)
    const decision = assertBookingRescheduleDecision(input.decision) === 'accepted'
        ? BookingRescheduleStatus.Accepted
        : BookingRescheduleStatus.Rejected

    const requestRepository = AppDataSource.getRepository(BookingRescheduleRequestEntity)
    const rescheduleRequest = await requestRepository
        .createQueryBuilder('request')
        .leftJoinAndSelect('request.booking', 'booking')
        .leftJoinAndSelect('booking.cabinet', 'cabinet')
        .leftJoinAndSelect('booking.service', 'service')
        .leftJoinAndSelect('booking.client', 'client')
        .where('request.bookingId = :bookingId', { bookingId })
        .andWhere('request.status = :status', { status: BookingRescheduleStatus.Pending })
        .andWhere('cabinet.ownerId = :ownerId', { ownerId: owner.id })
        .getOne()

    if (!rescheduleRequest) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Pending reschedule request not found.',
        })
    }

    const booking = rescheduleRequest.booking
    const previousSlot = `${booking.date} ${booking.startTime.slice(0, 5)}-${booking.endTime.slice(0, 5)}`
    const proposedSlot = `${rescheduleRequest.proposedDate} ${rescheduleRequest.proposedStartTime.slice(0, 5)}-${rescheduleRequest.proposedEndTime.slice(0, 5)}`

    if (decision === BookingRescheduleStatus.Accepted) {
        await assertBookingSlotIsAvailable({
            cabinetId: booking.cabinetId,
            serviceId: booking.serviceId,
            date: rescheduleRequest.proposedDate,
            startTime: rescheduleRequest.proposedStartTime.slice(0, 5),
            endTime: rescheduleRequest.proposedEndTime.slice(0, 5),
        }, booking.id)
    }

    try {
        await AppDataSource.transaction(async (manager) => {
            rescheduleRequest.status = decision
            rescheduleRequest.resolvedById = owner.id
            rescheduleRequest.resolutionReason = input.reason ?? null
            rescheduleRequest.resolvedAt = new Date()

            if (decision === BookingRescheduleStatus.Accepted) {
                booking.date = rescheduleRequest.proposedDate
                booking.startTime = rescheduleRequest.proposedStartTime
                booking.endTime = rescheduleRequest.proposedEndTime
                await manager.getRepository(BookingEntity).save(booking)
            }

            await manager.getRepository(BookingRescheduleRequestEntity).save(rescheduleRequest)
            await manager.getRepository(BookingStatusHistoryEntity).save(
                manager.getRepository(BookingStatusHistoryEntity).create({
                    bookingId: booking.id,
                    status: booking.status,
                    changedById: owner.id,
                    reason: decision === BookingRescheduleStatus.Accepted
                        ? `Rescheduled from ${previousSlot} to ${proposedSlot}.`
                        : `Reschedule to ${proposedSlot} rejected${input.reason ? `: ${input.reason}` : '.'}`,
                })
            )

            const accepted = decision === BookingRescheduleStatus.Accepted

            await createBookingNotification({
                userId: booking.clientId,
                category: NotificationCategory.Booking,
                template: {
                    key: accepted
                        ? 'booking.reschedule.accepted.client'
                        : 'booking.reschedule.rejected.client',
                    params: {
                        [accepted ? 'proposedSlot' : 'previousSlot']:
                            accepted ? proposedSlot : previousSlot,
                    },
                },
                metadata: { bookingId, rescheduleRequestId: rescheduleRequest.id },
            }, bookingNotificationKey(bookingId, `reschedule-${decision}`, booking.clientId, rescheduleRequest.id), manager)

            await createBookingNotification({
                userId: owner.id,
                category: NotificationCategory.Booking,
                template: {
                    key: accepted
                        ? 'booking.reschedule.accepted.owner'
                        : 'booking.reschedule.rejected.owner',
                    params: {
                        [accepted ? 'proposedSlot' : 'previousSlot']:
                            accepted ? proposedSlot : previousSlot,
                    },
                },
                metadata: { bookingId, rescheduleRequestId: rescheduleRequest.id },
            }, bookingNotificationKey(bookingId, `reschedule-${decision}`, owner.id, rescheduleRequest.id), manager)
        })
    } catch (error) {
        if (isBookingSlotContentionError(error)) {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.Conflict,
                message: 'The requested slot was just booked by another client.',
            })
        }
        throw error
    }

    recordOwnerRescheduleDecision({
        decision: input.decision,
        createdAt: rescheduleRequest.createdAt,
        resolvedAt: rescheduleRequest.resolvedAt ?? undefined,
    })

    return {
        request: toBookingRescheduleRequest(rescheduleRequest),
        booking: toOwnerBooking(booking),
    }
}

export async function getOwnerPendingRescheduleRequests(owner: UserEntity) {
    assertOwner(owner)

    const requests = await AppDataSource
        .getRepository(BookingRescheduleRequestEntity)
        .createQueryBuilder('request')
        .leftJoin('request.booking', 'booking')
        .leftJoin('booking.cabinet', 'cabinet')
        .where('request.status = :status', { status: BookingRescheduleStatus.Pending })
        .andWhere('cabinet.ownerId = :ownerId', { ownerId: owner.id })
        .orderBy('request.createdAt', 'ASC')
        .take(50)
        .getMany()

    const mappedRequests = requests.map(toBookingRescheduleRequest)
    const pendingReschedulesOlderThan24Hours = mappedRequests.filter((request) =>
        Date.now() - request.createdAt.getTime() >= DAY_IN_MILLISECONDS
    ).length

    recordOwnerActionQueueSnapshot({
        pendingBookings: 0,
        pendingReschedules: mappedRequests.length,
        pendingBookingsOlderThan24Hours: 0,
        pendingReschedulesOlderThan24Hours,
    })

    return mappedRequests
}

function applyBookingListFilters(
    query: SelectQueryBuilder<BookingEntity>,
    input: BookingListQuery | undefined,
) {
    assertBookingDateRange(input?.fromDate, input?.toDate)

    if (input?.status) {
        query.andWhere('booking.status = :bookingStatus', { bookingStatus: input.status })
    }

    if (input?.fromDate) {
        query.andWhere('booking.date >= :fromDate', { fromDate: input.fromDate })
    }

    if (input?.toDate) {
        query.andWhere('booking.date <= :toDate', { toDate: input.toDate })
    }
}

function applyBookingCursor(
    query: SelectQueryBuilder<BookingEntity>,
    cursor: string | undefined,
) {
    if (!cursor) return

    const payload = decodeCursor(cursor, ['date', 'startTime', 'id'])
    const date = payload.date ?? ''
    const startTime = payload.startTime ?? ''
    const id = payload.id ?? ''

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date)
        || !/^\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(startTime)
    ) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BadRequest,
            message: 'Cursor is invalid or expired.',
        })
    }

    query.andWhere(`(
        booking.date > :cursorDate
        OR (booking.date = :cursorDate AND booking.startTime > :cursorStartTime)
        OR (
            booking.date = :cursorDate
            AND booking.startTime = :cursorStartTime
            AND booking.id > :cursorId
        )
    )`, {
        cursorDate: date,
        cursorStartTime: startTime,
        cursorId: id,
    })
}

function toBookingCursor(booking: ClientBooking) {
    return {
        date: booking.date,
        startTime: booking.startTime,
        id: booking.id,
    }
}

export async function getClientBookings(
    client: UserEntity,
    input?: BookingListQuery,
): Promise<ClientBooking[] | CursorPage<ClientBooking>> {
    assertClient(client)

    const bookingRepository = AppDataSource.getRepository(BookingEntity)
    const isPaginated = isCursorPaginationRequested(input ?? {})
    const limit = getCursorLimit(input?.limit)

    const query = bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.cabinet', 'cabinet')
        .leftJoinAndSelect('booking.service', 'service')
        .where('booking.clientId = :clientId', {
            clientId: client.id,
        })
    applyBookingListFilters(query, input)
    applyBookingCursor(query, input?.cursor)
    query
        .orderBy('booking.date', 'ASC')
        .addOrderBy('booking.startTime', 'ASC')
        .addOrderBy('booking.id', 'ASC')

    const bookings = isPaginated
        ? await query.take(limit + 1).getMany()
        : await query.getMany()

    const mappedBookings = bookings.map(toClientBooking)

    return isPaginated
        ? toCursorPage(mappedBookings, limit, toBookingCursor)
        : mappedBookings
}

export async function cancelClientBooking(
    client: UserEntity,
    bookingId: string,
    cancellationReason: string,
    frontendOrigin: string
) {
    assertClient(client)
    const normalizedCancellationReason = normalizeBookingCancellationReason(cancellationReason)

    const bookingRepository = AppDataSource.getRepository(BookingEntity)

    const booking = await bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.cabinet', 'cabinet')
        .leftJoinAndSelect('booking.service', 'service')
        .where('booking.id = :bookingId', { bookingId })
        .andWhere('booking.clientId = :clientId', { clientId: client.id })
        .getOne()

    if (!booking) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Booking not found.',
        })
    }

    if (booking.status === BookingStatus.Completed) {
        throw new AppError({
            statusCode: 409,
            code: ERROR_CODES.Conflict,
            message: 'Completed booking cannot be cancelled.',
        })
    }

    if (booking.status === BookingStatus.Cancelled) {
        return toPublicBooking(booking)
    }

    const savedBooking = await AppDataSource.transaction(async (manager) => {
        const transactionBooking = await manager.getRepository(BookingEntity)
            .createQueryBuilder('booking')
            .leftJoinAndSelect('booking.cabinet', 'cabinet')
            .leftJoinAndSelect('booking.service', 'service')
            .where('booking.id = :bookingId', { bookingId })
            .andWhere('booking.clientId = :clientId', { clientId: client.id })
            .setLock('pessimistic_write')
            .getOne()

        if (!transactionBooking) {
            throw new AppError({
                statusCode: 404,
                code: ERROR_CODES.NotFound,
                message: 'Booking not found.',
            })
        }

        if (transactionBooking.status === BookingStatus.Completed) {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.Conflict,
                message: 'Completed booking cannot be cancelled.',
            })
        }

        if (transactionBooking.status === BookingStatus.Cancelled) {
            return transactionBooking
        }

        transactionBooking.status = BookingStatus.Cancelled
        transactionBooking.cancellationReason = normalizedCancellationReason

        const saved = await manager.getRepository(BookingEntity).save(transactionBooking)
        await recordBookingStatus(saved.id, saved.status, client.id, normalizedCancellationReason, manager)

        const owner = await manager.getRepository(UserEntity).findOne({
            where: { id: transactionBooking.cabinet.ownerId },
        })

        await notifyClientCancelledBooking(transactionBooking, client, owner, manager)

        if (owner && shouldDeliverNotification(NotificationCategory.Booking, owner, 'email')) {
            await enqueueBookingEmail(transactionBooking.id, {
                toEmail: owner.email,
                recipientName: owner.name,
                bookingDetails: {
                    date: transactionBooking.date,
                    startTime: transactionBooking.startTime,
                    endTime: transactionBooking.endTime,
                    cabinetTitle: transactionBooking.cabinet.title,
                    serviceTitle: transactionBooking.service.title,
                },
                status: 'cancelled',
                isForOwner: true,
                frontendOrigin,
                locale: owner.locale ?? undefined,
            }, manager)
        }

        if (shouldDeliverNotification(NotificationCategory.Booking, client, 'email')) {
            await enqueueBookingEmail(transactionBooking.id, {
                toEmail: client.email,
                recipientName: client.name,
                bookingDetails: {
                    date: transactionBooking.date,
                    startTime: transactionBooking.startTime,
                    endTime: transactionBooking.endTime,
                    cabinetTitle: transactionBooking.cabinet.title,
                    serviceTitle: transactionBooking.service.title,
                },
                status: 'cancelled',
                isForOwner: false,
                frontendOrigin,
                locale: client.locale ?? undefined,
            }, manager)
        }

        return saved
    })

    return toPublicBooking(savedBooking)
}

export async function getOwnerBookings(
    owner: UserEntity,
    input?: BookingListQuery,
): Promise<OwnerBooking[] | CursorPage<OwnerBooking>> {
    assertOwner(owner)

    const bookingRepository = AppDataSource.getRepository(BookingEntity)
    const isPaginated = isCursorPaginationRequested(input ?? {})
    const limit = getCursorLimit(input?.limit)

    const query = bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.client', 'client')
        .leftJoinAndSelect('booking.cabinet', 'cabinet')
        .leftJoinAndSelect('booking.service', 'service')
        .where('cabinet.ownerId = :ownerId', { ownerId: owner.id })
    applyBookingListFilters(query, input)
    applyBookingCursor(query, input?.cursor)
    query
        .orderBy('booking.date', 'ASC')
        .addOrderBy('booking.startTime', 'ASC')
        .addOrderBy('booking.id', 'ASC')

    const bookings = isPaginated
        ? await query.take(limit + 1).getMany()
        : await query.getMany()

    const mappedBookings = bookings.map(toOwnerBooking)
    const pendingBookings = mappedBookings.filter((booking) => booking.status === BookingStatus.Pending)
    const pendingBookingsOlderThan24Hours = pendingBookings.filter((booking) =>
        Date.now() - booking.createdAt.getTime() >= DAY_IN_MILLISECONDS
    ).length

    recordOwnerActionQueueSnapshot({
        pendingBookings: pendingBookings.length,
        pendingReschedules: 0,
        pendingBookingsOlderThan24Hours,
        pendingReschedulesOlderThan24Hours: 0,
    })

    return isPaginated
        ? toCursorPage(mappedBookings, limit, toBookingCursor)
        : mappedBookings
}

export async function createOwnerBooking(
    owner: UserEntity,
    input: OwnerCreateBookingInput,
    frontendOrigin: string
) {
    assertOwner(owner)
    const comment = normalizeBookingComment(input.comment)

    await assertClientExists(input.clientId)
    await assertCabinetAndServiceAreBookable(
        input.cabinetId,
        input.serviceId,
        owner.id
    )
    await assertBookingSlotIsAvailable(input)

    const bookingRepository = AppDataSource.getRepository(BookingEntity)

    const booking = bookingRepository.create({
        clientId: input.clientId,
        cabinetId: input.cabinetId,
        serviceId: input.serviceId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        status: BookingStatus.Confirmed,
        comment,
    })

    const ownerBooking = await AppDataSource.transaction(async (manager) => {
        const savedBooking = await saveNewBooking(manager.getRepository(BookingEntity), booking)
        await recordBookingStatus(savedBooking.id, savedBooking.status, owner.id, null, manager)
        const fullBooking = await getOwnerBookingEntityById(owner.id, savedBooking.id, manager)

        await notifyOwnerCreatedBooking(fullBooking, manager)

        if (fullBooking.client && shouldDeliverNotification(NotificationCategory.Booking, fullBooking.client, 'email')) {
            await enqueueBookingEmail(fullBooking.id, {
                toEmail: fullBooking.client.email,
                recipientName: fullBooking.client.name,
                bookingDetails: {
                    date: input.date,
                    startTime: input.startTime,
                    endTime: input.endTime,
                    cabinetTitle: fullBooking.cabinet.title,
                    serviceTitle: fullBooking.service.title,
                },
                status: 'confirmed',
                isForOwner: false,
                frontendOrigin,
                locale: fullBooking.client.locale ?? undefined,
            }, manager)
        }

        return fullBooking
    })

    return toOwnerBooking(ownerBooking)
}

export async function updateOwnerBookingStatus(
    owner: UserEntity,
    bookingId: string,
    status: BookingStatus,
    frontendOrigin: string
) {
    assertOwner(owner)

    const booking = await getOwnerBookingEntityById(owner.id, bookingId)

    if (isActiveBookingStatus(status)) {
        await assertBookingSlotIsAvailable(
            {
                cabinetId: booking.cabinetId,
                serviceId: booking.serviceId,
                date: booking.date,
                startTime: booking.startTime,
                endTime: booking.endTime,
                comment: booking.comment ?? undefined,
            },
            booking.id
        )
    }

    const updatedBooking = await AppDataSource.transaction(async (manager) => {
        const transactionBooking = await manager.getRepository(BookingEntity)
            .createQueryBuilder('booking')
            .leftJoinAndSelect('booking.client', 'client')
            .leftJoinAndSelect('booking.cabinet', 'cabinet')
            .leftJoinAndSelect('booking.service', 'service')
            .where('booking.id = :bookingId', { bookingId: booking.id })
            .andWhere('cabinet.ownerId = :ownerId', { ownerId: owner.id })
            .setLock('pessimistic_write', undefined, ['booking'])
            .getOne()

        if (!transactionBooking) {
            throw new AppError({
                statusCode: 404,
                code: ERROR_CODES.NotFound,
                message: 'Booking not found.',
            })
        }

        const previousStatus = transactionBooking.status
        transactionBooking.status = status

        await manager.getRepository(BookingEntity).save(transactionBooking)
        await recordBookingStatus(transactionBooking.id, status, owner.id, null, manager)
        await notifyBookingStatusChanged(transactionBooking, previousStatus, manager)

        if (
            transactionBooking.client &&
            shouldDeliverNotification(NotificationCategory.Booking, transactionBooking.client, 'email') &&
            previousStatus !== status
        ) {
            if (status === BookingStatus.Confirmed) {
                await enqueueBookingEmail(transactionBooking.id, {
                    toEmail: transactionBooking.client.email,
                    recipientName: transactionBooking.client.name,
                    bookingDetails: {
                        date: transactionBooking.date,
                        startTime: transactionBooking.startTime,
                        endTime: transactionBooking.endTime,
                        cabinetTitle: transactionBooking.cabinet.title,
                        serviceTitle: transactionBooking.service.title,
                    },
                    status: 'confirmed',
                    isForOwner: false,
                    frontendOrigin,
                    locale: transactionBooking.client.locale ?? undefined,
                }, manager)
            } else if (status === BookingStatus.Cancelled) {
                await enqueueBookingEmail(transactionBooking.id, {
                    toEmail: transactionBooking.client.email,
                    recipientName: transactionBooking.client.name,
                    bookingDetails: {
                        date: transactionBooking.date,
                        startTime: transactionBooking.startTime,
                        endTime: transactionBooking.endTime,
                        cabinetTitle: transactionBooking.cabinet.title,
                        serviceTitle: transactionBooking.service.title,
                    },
                    status: 'cancelled',
                    isForOwner: false,
                    frontendOrigin,
                    locale: transactionBooking.client.locale ?? undefined,
                }, manager)
            }
        }

        return {
            booking: transactionBooking,
            previousStatus,
        }
    })

    recordOwnerBookingDecision({
        previousStatus: updatedBooking.previousStatus,
        nextStatus: updatedBooking.booking.status,
        createdAt: updatedBooking.booking.createdAt,
    })

    return toOwnerBooking(updatedBooking.booking)
}

export function recordOwnerActionCenterEvent(
    owner: UserEntity,
    action: Parameters<typeof recordOwnerActionCenterClick>[0],
) {
    assertOwner(owner)
    recordOwnerActionCenterClick(action)

    return { accepted: true as const }
}

export function recordClientExperimentEventFromRoute(
    client: UserEntity,
    event: ClientExperimentEventName,
) {
    return recordClientExperimentEvent(client, event)
}

export async function updateOwnerBookingNote(
    owner: UserEntity,
    bookingId: string,
    ownerNote: string | null
) {
    assertOwner(owner)
    const normalizedOwnerNote = normalizeBookingOwnerNote(ownerNote)

    const bookingRepository = AppDataSource.getRepository(BookingEntity)
    const booking = await getOwnerBookingEntityById(owner.id, bookingId)

    booking.ownerNote = normalizedOwnerNote
    await bookingRepository.save(booking)

    return toOwnerBooking(booking)
}

export async function getOccupiedSlots(cabinetId: string, date: string) {
    const bookingRepository = AppDataSource.getRepository(BookingEntity)

    const bookings = await bookingRepository.find({
        where: {
            cabinetId,
            date,
            status: In(activeBookingStatuses),
        },
        select: ['startTime', 'endTime'],
        order: { startTime: 'ASC' },
    })

    return bookings.map((b) => ({
        start: b.startTime,
        end: b.endTime,
    }))
}
