import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireChatReportTextRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const CHAT_REPORT_TEXT_FIELDS = [
    { value: 'description', binding: 'descriptionBinding' },
    { value: 'resolutionReason', binding: 'resolutionReasonBinding' },
    { value: 'assignmentReason', binding: 'assignmentReasonBinding' },
    { value: 'extensionReason', binding: 'extensionReasonBinding' },
] as const
export type ChatReportTextValue = typeof CHAT_REPORT_TEXT_FIELDS[number]['value']
export type ChatReportTextBinding = typeof CHAT_REPORT_TEXT_FIELDS[number]['binding']
export type ChatReportTextRecord = {
    id?: string
    threadId?: string
    reporterId?: string
} & Partial<Record<ChatReportTextValue | ChatReportTextBinding, string | null>>

export function chatReportTextContext(record: Pick<ChatReportTextRecord, 'threadId' | 'reporterId'>) {
    if (!record.threadId || !UUID.test(record.threadId) || !record.reporterId || !UUID.test(record.reporterId)) {
        throw new Error('Encrypted chat report owner scope is invalid.')
    }
    return JSON.stringify([record.threadId.toLowerCase(), record.reporterId.toLowerCase()])
}

export function sealChatReportTextFields(record: ChatReportTextRecord) {
    if (!CHAT_REPORT_TEXT_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (typeof record.id !== 'string' || !UUID.test(record.id)) throw new Error('Encrypted chat report record ID is missing.')
    const context = chatReportTextContext(record)
    for (const { value, binding } of CHAT_REPORT_TEXT_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        record[binding] = plaintext === null ? null
            : createPlaintextRecordBinding('autocare_chat_reports', value, plaintext, record.id, context)
    }
}

export function openChatReportTextFields(record: ChatReportTextRecord) {
    if (!CHAT_REPORT_TEXT_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (typeof record.id !== 'string' || !UUID.test(record.id)) throw new Error('Encrypted chat report record ID is missing.')
    const context = chatReportTextContext(record)
    const allowLegacy = !requireChatReportTextRecordBinding()
    for (const { value, binding } of CHAT_REPORT_TEXT_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        if (plaintext === null) {
            if (record[binding] !== null && record[binding] !== undefined) {
                throw new Error(`Encrypted autocare_chat_reports.${value} record binding is invalid.`)
            }
            continue
        }
        verifyPlaintextRecordBinding('autocare_chat_reports', value, plaintext, record.id,
            record[binding], { allowLegacy, context })
    }
}
