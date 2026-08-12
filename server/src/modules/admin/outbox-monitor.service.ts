import { In, MoreThanOrEqual } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import { OutboxEventEntity, OutboxEventStatus } from '../../entities/outbox/outbox-event.entity.js'
import { UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { isAdminRole } from '../../shared/auth/roles.js'
import { OUTBOX_MAX_ATTEMPTS } from '../outbox/outbox.service.js'
import { canDeadLetterOutboxEvent, canRetryOutboxEvent } from './outbox-state.js'

function assertAdmin(user: UserEntity) {
    if (!isAdminRole(user.role)) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only admins can view outbox health.',
        })
    }
}

export async function getOutboxHealth(user: UserEntity) {
    assertAdmin(user)

    const repository = AppDataSource.getRepository(OutboxEventEntity)
    const statuses = Object.values(OutboxEventStatus)
    const counts = await Promise.all(statuses.map(async (status) => [
        status,
        await repository.countBy({ status }),
    ] as const))
    const failedEvents = await repository.find({
        where: { status: OutboxEventStatus.Failed },
        order: { attempts: 'DESC', availableAt: 'ASC' },
        take: 100,
        select: [
            'id',
            'type',
            'idempotencyKey',
            'status',
            'attempts',
            'availableAt',
            'lockedAt',
            'processedAt',
            'lastError',
            'createdAt',
        ],
    })

    return {
        counts: Object.fromEntries(counts),
        abandonedCount: await repository.count({
            where: {
                status: In([OutboxEventStatus.Failed]),
                attempts: MoreThanOrEqual(OUTBOX_MAX_ATTEMPTS),
            },
        }),
        deadLetterCount: await repository.countBy({ status: OutboxEventStatus.DeadLetter }),
        failedEvents,
    }
}

export async function retryOutboxEvent(user: UserEntity, eventId: string) {
    assertAdmin(user)

    const repository = AppDataSource.getRepository(OutboxEventEntity)
    const event = await repository.findOneBy({ id: eventId })

    if (!event) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Outbox event not found.',
        })
    }

    if (!canRetryOutboxEvent(event.status)) {
        throw new AppError({
            statusCode: 409,
            code: ERROR_CODES.Conflict,
            message: 'Outbox event cannot be retried in its current state.',
        })
    }

    event.status = OutboxEventStatus.Pending
    event.attempts = 0
    event.availableAt = new Date()
    event.lockedAt = null
    event.processedAt = null
    event.lastError = null

    return repository.save(event)
}

export async function deadLetterOutboxEvent(user: UserEntity, eventId: string) {
    assertAdmin(user)

    const repository = AppDataSource.getRepository(OutboxEventEntity)
    const event = await repository.findOneBy({ id: eventId })

    if (!event) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Outbox event not found.',
        })
    }

    if (!canDeadLetterOutboxEvent(event.status, event.attempts, OUTBOX_MAX_ATTEMPTS)) {
        throw new AppError({
            statusCode: 409,
            code: ERROR_CODES.Conflict,
            message: 'Only abandoned failed events can be moved to dead letter.',
        })
    }

    event.status = OutboxEventStatus.DeadLetter
    event.lockedAt = null
    event.availableAt = new Date()
    event.lastError = event.lastError ?? 'Moved to dead letter by an administrator.'

    return repository.save(event)
}
