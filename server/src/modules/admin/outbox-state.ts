import { OutboxEventStatus } from '../../entities/outbox/outbox-event.entity.js'

export function canRetryOutboxEvent(status: OutboxEventStatus) {
    return status !== OutboxEventStatus.Completed && status !== OutboxEventStatus.Processing
}

export function canDeadLetterOutboxEvent(
    status: OutboxEventStatus,
    attempts: number,
    maxAttempts: number,
) {
    return status === OutboxEventStatus.Failed && attempts >= maxAttempts
}
