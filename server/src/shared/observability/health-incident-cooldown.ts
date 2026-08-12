export const DEFAULT_HEALTH_INCIDENT_COOLDOWN_MS = 5 * 60 * 1000

export function shouldEmitHealthIncident(
    lastEmittedAtMs: number | null,
    nowMs = Date.now(),
    cooldownMs = DEFAULT_HEALTH_INCIDENT_COOLDOWN_MS,
) {
    if (!Number.isFinite(nowMs) || !Number.isFinite(cooldownMs) || cooldownMs < 1) return false
    if (lastEmittedAtMs === null) return true
    if (!Number.isFinite(lastEmittedAtMs) || lastEmittedAtMs > nowMs) return false

    return nowMs - lastEmittedAtMs >= cooldownMs
}
