export const SECURITY_EVENT_SINKS = ['audit_log', 'security_event'] as const
export const SECURITY_EVENT_SINK_FAILURE_INCIDENT_TITLE = 'Security event sink write failed'

export type SecurityEventSink = (typeof SECURITY_EVENT_SINKS)[number]

export function getFailedSecurityEventSinks(
    results: readonly PromiseSettledResult<unknown>[],
) {
    return SECURITY_EVENT_SINKS.filter((_, index) => results[index]?.status !== 'fulfilled')
}

export function getSecurityEventSinkFailureMetadata(
    failedSinks: readonly SecurityEventSink[],
) {
    return {
        failedSinks: [...failedSinks],
        sinkCount: failedSinks.length,
    }
}
