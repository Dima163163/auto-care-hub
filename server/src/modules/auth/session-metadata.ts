import { normalizeStoredSessionValue } from './session-metadata-policy.js'

export const MAX_SESSION_USER_AGENT_LENGTH = 512
export const MAX_SESSION_IP_LENGTH = 64

export function normalizeSessionMetadata(input: {
    userAgent?: string | null
    ipAddress?: string | null
}) {
    const userAgent = normalizeStoredSessionValue(input.userAgent)
    const ipAddress = normalizeStoredSessionValue(input.ipAddress)

    if (userAgent && userAgent.length > MAX_SESSION_USER_AGENT_LENGTH) {
        throw new Error('Session user agent is too long.')
    }
    if (ipAddress && ipAddress.length > MAX_SESSION_IP_LENGTH) {
        throw new Error('Session IP address is too long.')
    }

    return { userAgent, ipAddress }
}
