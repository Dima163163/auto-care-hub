import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireChatBlockReasonRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ChatBlockReasonRecord = {
    id?: string
    threadId?: string
    blockerId?: string
    blockedUserId?: string
    reason?: string | null
    reasonBinding?: string | null
}

export function chatBlockReasonContext(record: ChatBlockReasonRecord) {
    const ids = [record.threadId, record.blockerId, record.blockedUserId]
    if (ids.some((id) => typeof id !== 'string' || !UUID.test(id))) {
        throw new Error('Encrypted chat block owner scope is invalid.')
    }
    return JSON.stringify(ids.map((id) => id!.toLowerCase()))
}

export function sealChatBlockReason(record: ChatBlockReasonRecord) {
    if (record.reason === undefined) return
    if (record.reason === null) {
        record.reasonBinding = null
        return
    }
    if (typeof record.id !== 'string' || !UUID.test(record.id)) throw new Error('Encrypted chat block record ID is missing.')
    record.reasonBinding = createPlaintextRecordBinding('autocare_chat_blocks', 'reason', record.reason,
        record.id, chatBlockReasonContext(record))
}

export function openChatBlockReason(record: ChatBlockReasonRecord) {
    if (record.reason === undefined) return
    if (record.reason === null) {
        if (record.reasonBinding !== null && record.reasonBinding !== undefined) {
            throw new Error('Encrypted autocare_chat_blocks.reason record binding is invalid.')
        }
        return
    }
    if (typeof record.id !== 'string' || !UUID.test(record.id)) throw new Error('Encrypted chat block record ID is missing.')
    verifyPlaintextRecordBinding('autocare_chat_blocks', 'reason', record.reason,
        record.id, record.reasonBinding,
        { allowLegacy: !requireChatBlockReasonRecordBinding(), context: chatBlockReasonContext(record) })
}
