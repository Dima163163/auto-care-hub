import { parseRequestDate } from './request-date'

export type RequestDraft = {
    selectedDate: string
    customDate: string
    selectedTime: string
}

const requestDateChoices = new Set(['', 'today', 'tomorrow', 'day-2', 'day-3'])

export function parseRequestDraft(value: unknown): RequestDraft | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const raw = value as Record<string, unknown>
    if (typeof raw.selectedDate !== 'string' || !requestDateChoices.has(raw.selectedDate)) return null
    if (typeof raw.customDate !== 'string' || (raw.customDate !== '' && !parseRequestDate(raw.customDate))) return null
    if (typeof raw.selectedTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.selectedTime)) return null
    return {
        selectedDate: raw.selectedDate,
        customDate: raw.customDate,
        selectedTime: raw.selectedTime,
    }
}
