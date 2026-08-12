import {
    SecurityEventSeverity,
    SecurityEventType,
} from '../../entities/security-event/security-event.entity.js'

export const SECURITY_EVENT_ALERT_WINDOW_MS = 60_000
export const SECURITY_EVENT_ALERT_THRESHOLD = 20
const MAX_SECURITY_ALERT_KEYS = 256

type SecurityAlertInput = {
    type: SecurityEventType
    severity: SecurityEventSeverity
    route: string | null
}

type SecurityAlertState = {
    count: number
    windowStartedAt: number
    alerted: boolean
}

export type SecurityAlertDecision = {
    triggered: boolean
    count: number
    threshold: number
    windowStartedAt: number
    reason: 'critical_event' | 'burst_threshold' | null
}

const alertStates = new Map<string, SecurityAlertState>()

function normalizeRoute(route: string | null) {
    return route?.trim().slice(0, 96) || 'unknown'
}

function getAlertKey(input: SecurityAlertInput) {
    return `${input.type}:${normalizeRoute(input.route)}`
}

function getOrCreateState(key: string, now: number) {
    const current = alertStates.get(key)
    if (current && now - current.windowStartedAt < SECURITY_EVENT_ALERT_WINDOW_MS) {
        return current
    }

    if (!current && alertStates.size >= MAX_SECURITY_ALERT_KEYS) {
        const oldestKey = alertStates.keys().next().value
        if (oldestKey) alertStates.delete(oldestKey)
    }

    const next = { count: 0, windowStartedAt: now, alerted: false }
    alertStates.set(key, next)
    return next
}

export function observeSecurityAlert(input: SecurityAlertInput, now = Date.now()): SecurityAlertDecision {
    if (!Number.isSafeInteger(now) || now < 0) {
        throw new Error('Security alert timestamp is invalid.')
    }

    const state = getOrCreateState(getAlertKey(input), now)
    state.count += 1

    const reason = input.severity === SecurityEventSeverity.Critical
        ? 'critical_event'
        : state.count >= SECURITY_EVENT_ALERT_THRESHOLD
            ? 'burst_threshold'
            : null
    const triggered = reason !== null && !state.alerted
    if (triggered) state.alerted = true

    return {
        triggered,
        count: state.count,
        threshold: SECURITY_EVENT_ALERT_THRESHOLD,
        windowStartedAt: state.windowStartedAt,
        reason: triggered ? reason : null,
    }
}

export function resetSecurityAlertPolicy() {
    alertStates.clear()
}
