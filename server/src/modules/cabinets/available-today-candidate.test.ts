import { describe, expect, it } from 'vitest'

import { getAvailableTodayCandidateSql } from './available-today-candidate.js'

describe('availableToday SQL candidate filter', () => {
    it('keeps availability filtering in indexed relational tables', () => {
        const sql = getAvailableTodayCandidateSql()

        expect(sql).toContain('FROM services active_service')
        expect(sql).toContain('FROM cabinet_schedules schedule')
        expect(sql).toContain('FROM cabinet_schedule_exceptions exception')
        expect(sql).toContain('FROM cabinet_blocked_periods closed_period')
        expect(sql).toContain('CURRENT_TIMESTAMP AT TIME ZONE cabinet.timezone')
    })
})
