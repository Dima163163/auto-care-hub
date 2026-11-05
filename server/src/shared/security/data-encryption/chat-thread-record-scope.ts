const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ChatThreadRecordScope = {
    type?: string
    requestId?: string | null
    providerId?: string | null
    clientId?: string | null
    createdById?: string | null
}

/** Authenticates the unencrypted links that grant access to a private chat. */
export function chatThreadRecordContext(record: ChatThreadRecordScope) {
    if (!record.type || !['service_request', 'provider_inquiry', 'support', 'admin_escalation'].includes(record.type)
        || [record.requestId, record.providerId, record.clientId, record.createdById]
            .some((value) => value !== null && value !== undefined && !UUID.test(value))) {
        throw new Error('Encrypted chat thread scope is invalid.')
    }
    return JSON.stringify([
        record.type,
        record.requestId?.toLowerCase() ?? null,
        record.providerId?.toLowerCase() ?? null,
        record.clientId?.toLowerCase() ?? null,
        record.createdById?.toLowerCase() ?? null,
    ])
}
