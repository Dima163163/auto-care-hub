const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type MessageBodyRecordScope = {
    requestId?: string | null
    threadId?: string | null
    senderId?: string
}

/** Authenticates the unencrypted access-control links alongside the body. */
export function messageBodyRecordContext(record: MessageBodyRecordScope) {
    if (!record.senderId || !UUID.test(record.senderId)
        || (record.requestId !== null && record.requestId !== undefined && !UUID.test(record.requestId))
        || (record.threadId !== null && record.threadId !== undefined && !UUID.test(record.threadId))
        || (!record.requestId && !record.threadId)) {
        throw new Error('Encrypted message body parent scope is invalid.')
    }
    return JSON.stringify([
        record.requestId?.toLowerCase() ?? null,
        record.threadId?.toLowerCase() ?? null,
        record.senderId.toLowerCase(),
    ])
}
