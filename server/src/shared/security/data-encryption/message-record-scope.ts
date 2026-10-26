const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type MessageRecordScope = {
    requestId?: string | null
    threadId?: string | null
    senderId?: string
    kind?: string
}

/** Authenticates the unencrypted access-control links alongside message content. */
export function messageRecordContext(record: MessageRecordScope) {
    if (!record.senderId || !UUID.test(record.senderId)
        || (record.requestId !== null && record.requestId !== undefined && !UUID.test(record.requestId))
        || (record.threadId !== null && record.threadId !== undefined && !UUID.test(record.threadId))
        || (!record.requestId && !record.threadId)
        || !record.kind || !['text', 'system', 'offer'].includes(record.kind)) {
        throw new Error('Encrypted message parent scope is invalid.')
    }
    return JSON.stringify([
        record.requestId?.toLowerCase() ?? null,
        record.threadId?.toLowerCase() ?? null,
        record.senderId.toLowerCase(),
        record.kind,
    ])
}
