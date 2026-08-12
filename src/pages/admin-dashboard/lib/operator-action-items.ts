import type {
    AdminPaymentAttention,
    OutboxHealth,
    SecurityCenterEvent,
    SystemIncident,
} from '@/features/admin/api/adminApi'
import { ROUTES } from '@/shared/constants/routes'
import type { TranslationKey } from '@/shared/lib/i18n'

export type OperatorActionPriority = 'critical' | 'high' | 'warning'
export type OperatorActionKind = 'security' | 'incident' | 'outbox' | 'payment'
export type OperatorActionStatus = 'open' | 'acknowledged' | 'investigating' | 'failed'

type OperatorActionSecurityEvent = Pick<
    SecurityCenterEvent,
    'id' | 'type' | 'severity' | 'status' | 'assigneeId' | 'reasonCode' |
    'createdAt' | 'lastAction' | 'actionTimeline'
>

export type OperatorActionItem = {
    id: string
    kind: OperatorActionKind
    title: string
    titleKey?: TranslationKey
    priority: OperatorActionPriority
    reasonCode: string
    status: OperatorActionStatus
    assigneeId: string | null
    occurredAt: string
    acknowledgedAt: string | null
    resolutionHistoryCount: number
    ageMinutes: number
    slaMinutes: number
    slaBreached: boolean
    href: string
}

export type OperatorQueueMetrics = {
    total: number
    assigned: number
    acknowledged: number
    slaBreached: number
    oldestAgeMinutes: number
    averageAgeMinutes: number
}

const MAX_ACTION_ITEMS = 12
const priorityWeight: Record<OperatorActionPriority, number> = {
    critical: 3,
    high: 2,
    warning: 1,
}

function getPriority(severity: SecurityCenterEvent['severity'] | SystemIncident['severity']): OperatorActionPriority {
    if (severity === 'critical') return 'critical'
    if (severity === 'high') return 'high'
    return 'warning'
}

function getSlaMinutes(priority: OperatorActionPriority) {
    if (priority === 'critical') return 30
    if (priority === 'high') return 120
    return 1_440
}

function getAgeMinutes(occurredAt: string, now: Date) {
    const timestamp = Date.parse(occurredAt)
    if (!Number.isFinite(timestamp)) return 0

    return Math.max(0, Math.floor((now.getTime() - timestamp) / 60_000))
}

function withSla(item: Omit<OperatorActionItem, 'ageMinutes' | 'slaBreached'>, now: Date): OperatorActionItem {
    const ageMinutes = getAgeMinutes(item.occurredAt, now)
    return {
        ...item,
        ageMinutes,
        slaBreached: ageMinutes > item.slaMinutes,
    }
}

function fromSecurityEvent(event: OperatorActionSecurityEvent, now: Date): OperatorActionItem | null {
    if (event.status === 'resolved' || event.status === 'suppressed') return null

    const priority = getPriority(event.severity)
    return withSla({
        id: `security:${event.id}`,
        kind: 'security',
        title: event.type,
        priority,
        reasonCode: event.reasonCode ?? event.type,
        status: event.status === 'open' || event.status === 'acknowledged' || event.status === 'investigating'
            ? event.status
            : 'open',
        assigneeId: event.assigneeId,
        occurredAt: event.createdAt,
        acknowledgedAt: event.lastAction?.createdAt ?? null,
        resolutionHistoryCount: event.actionTimeline.length,
        slaMinutes: getSlaMinutes(priority),
        href: ROUTES.adminSecurityCenter,
    }, now)
}

function fromSystemIncident(incident: SystemIncident, now: Date): OperatorActionItem | null {
    if (incident.status === 'resolved') return null

    const priority = getPriority(incident.severity)
    return withSla({
        id: `incident:${incident.id}`,
        kind: 'incident',
        title: incident.title,
        priority,
        reasonCode: incident.type,
        status: incident.status === 'open' || incident.status === 'acknowledged'
            ? incident.status
            : 'open',
        assigneeId: null,
        occurredAt: incident.lastOccurredAt,
        acknowledgedAt: incident.acknowledgedAt,
        resolutionHistoryCount: incident.resolvedAt ? 1 : 0,
        slaMinutes: getSlaMinutes(priority),
        href: `${ROUTES.adminAuditLogs}?tab=incidents`,
    }, now)
}

function fromOutboxEvent(event: OutboxHealth['failedEvents'][number], now: Date): OperatorActionItem {
    const priority: OperatorActionPriority = 'high'
    return withSla({
        id: `outbox:${event.id}`,
        kind: 'outbox',
        title: event.type,
        priority,
        reasonCode: event.type,
        status: 'failed',
        assigneeId: null,
        occurredAt: event.createdAt,
        acknowledgedAt: null,
        resolutionHistoryCount: 0,
        slaMinutes: getSlaMinutes(priority),
        href: ROUTES.adminAuditLogs,
    }, now)
}

function fromPaymentAttention(attention: AdminPaymentAttention, now: Date): OperatorActionItem[] {
    const items: OperatorActionItem[] = []

    if (attention.failedPaymentCount > 0) {
        items.push(withSla({
            id: 'payment:failed',
            kind: 'payment',
            title: 'payment_failures',
            titleKey: 'adminDashboard.operatorCenter.paymentFailures',
            priority: 'high',
            reasonCode: 'payment_failed',
            status: 'open',
            assigneeId: null,
            occurredAt: now.toISOString(),
            acknowledgedAt: null,
            resolutionHistoryCount: 0,
            slaMinutes: getSlaMinutes('high'),
            href: ROUTES.adminAuditLogs,
        }, now))
    }

    if (attention.openDisputeCount + attention.fundsWithdrawnDisputeCount > 0) {
        items.push(withSla({
            id: 'payment:disputes',
            kind: 'payment',
            title: 'payment_disputes',
            titleKey: 'adminDashboard.operatorCenter.paymentDisputes',
            priority: attention.fundsWithdrawnDisputeCount > 0 ? 'critical' : 'high',
            reasonCode: attention.fundsWithdrawnDisputeCount > 0
                ? 'payment_dispute_funds_withdrawn'
                : 'payment_dispute_open',
            status: 'open',
            assigneeId: null,
            occurredAt: now.toISOString(),
            acknowledgedAt: null,
            resolutionHistoryCount: 0,
            slaMinutes: getSlaMinutes(attention.fundsWithdrawnDisputeCount > 0 ? 'critical' : 'high'),
            href: ROUTES.adminAuditLogs,
        }, now))
    }

    return items
}

export function buildOperatorActionItems({
    securitySummary,
    incidents,
    outboxHealth,
    paymentAttention,
    now = new Date(),
}: {
    securitySummary?: { recentEvents: readonly OperatorActionSecurityEvent[] } | null
    incidents: readonly SystemIncident[]
    outboxHealth?: OutboxHealth | null
    paymentAttention?: AdminPaymentAttention | null
    now?: Date
}) {
    const items = [
        ...(securitySummary?.recentEvents ?? []).map((event) => fromSecurityEvent(event, now)),
        ...incidents.map((incident) => fromSystemIncident(incident, now)),
        ...(outboxHealth?.failedEvents ?? []).map((event) => fromOutboxEvent(event, now)),
        ...(paymentAttention ? fromPaymentAttention(paymentAttention, now) : []),
    ]
        .filter((item): item is OperatorActionItem => item !== null)
        .sort((left, right) => {
            const priorityDifference = priorityWeight[right.priority] - priorityWeight[left.priority]
            if (priorityDifference !== 0) return priorityDifference
            return Date.parse(right.occurredAt) - Date.parse(left.occurredAt)
        })

    return items.slice(0, MAX_ACTION_ITEMS)
}

export function buildOperatorQueueMetrics(items: readonly OperatorActionItem[]): OperatorQueueMetrics {
    if (items.length === 0) {
        return {
            total: 0,
            assigned: 0,
            acknowledged: 0,
            slaBreached: 0,
            oldestAgeMinutes: 0,
            averageAgeMinutes: 0,
        }
    }

    const totalAgeMinutes = items.reduce((sum, item) => sum + item.ageMinutes, 0)

    return {
        total: items.length,
        assigned: items.filter((item) => item.assigneeId !== null).length,
        acknowledged: items.filter((item) => item.acknowledgedAt !== null).length,
        slaBreached: items.filter((item) => item.slaBreached).length,
        oldestAgeMinutes: Math.max(...items.map((item) => item.ageMinutes)),
        averageAgeMinutes: Math.round(totalAgeMinutes / items.length),
    }
}
