import { type EntityManager } from 'typeorm'
import { AutoCareRepairEventEntity, AutoCareRescheduleRequestEntity, AutoCareRescheduleStatus } from '../../entities/index.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { enqueueNotification, enqueueNotificationSafely } from '../outbox/notification-outbox.service.js'
import { normalizeAutoCareRepairEventInput } from './repair-event-input-policy.js'

export async function appendRepairEventWithManager(manager: EntityManager, input: { requestId: string; actorId?: string | null; eventType: string; title: string; notes?: string | null; metadata?: Record<string, unknown> }) {
    const normalizedInput = normalizeAutoCareRepairEventInput(input)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Repair event payload is invalid.' })
    await manager.getRepository(AutoCareRepairEventEntity).save(manager.getRepository(AutoCareRepairEventEntity).create(normalizedInput))
}

export async function notifyAutoCareParticipant(input: {
    userId: string
    requestId: string
    event: string
    title: string
    message: string
    role: 'client' | 'owner'
}, manager?: EntityManager) {
    const notification = {
        userId: input.userId,
        category: NotificationCategory.Booking,
        title: input.title,
        message: input.message,
        link: input.role === 'owner' ? `/owner/autocare-requests?request=${input.requestId}` : `/profile/bookings?request=${input.requestId}`,
        metadata: { serviceRequestId: input.requestId, event: input.event, domain: 'autocare' },
    }
    const idempotencyKey = `notification:autocare:${input.requestId}:${input.event}:${input.userId}`
    if (manager) {
        await enqueueNotification(notification, idempotencyKey, manager)
        return
    }
    await enqueueNotificationSafely(notification, idempotencyKey)
}

export async function expirePendingAutoCareReschedule(manager: EntityManager, requestId: string, actorId: string, reason: string) {
    const repository = manager.getRepository(AutoCareRescheduleRequestEntity)
    const pending = await repository.findOne({
        where: { requestId, status: AutoCareRescheduleStatus.Pending },
        lock: { mode: 'pessimistic_write' },
    })
    if (!pending) return
    pending.status = AutoCareRescheduleStatus.Rejected
    pending.resolvedById = actorId
    pending.resolutionReason = reason
    pending.resolvedAt = new Date()
    await repository.save(pending)
}
