import { describe, expect, it } from 'vitest'

import { parseRequestDraft } from './request-draft'

describe('request draft parser', () => {
    it('keeps only non-sensitive appointment state', () => {
        expect(parseRequestDraft({ selectedDate: '', customDate: '2026-09-05', selectedTime: '10:30' })).toEqual({
            selectedDate: '',
            customDate: '2026-09-05',
            selectedTime: '10:30',
        })
    })

    it('rejects malformed dates and times while ignoring unexpected fields', () => {
        expect(parseRequestDraft({ selectedDate: 'today', customDate: '2026-02-30', selectedTime: '10:00' })).toBeNull()
        expect(parseRequestDraft({ selectedDate: 'today', customDate: '', selectedTime: '25:00' })).toBeNull()
        expect(parseRequestDraft({ selectedDate: 'today', customDate: '', selectedTime: '10:00', email: 'private@example.com' })).toEqual({
            selectedDate: 'today',
            customDate: '',
            selectedTime: '10:00',
        })
    })
})
