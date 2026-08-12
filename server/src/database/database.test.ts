import { describe, expect, it } from 'vitest'

import { readDatabasePoolStats } from './database.js'
import { evaluateDatabasePoolPressure } from './database-pool-pressure.js'

describe('database pool stats', () => {
    it('normalizes valid pg pool counters into active connections', () => {
        expect(readDatabasePoolStats({
            totalCount: 10,
            idleCount: 4,
            waitingCount: 2,
        })).toEqual({
            total: 10,
            idle: 4,
            active: 6,
            waiting: 2,
        })
    })

    it('rejects malformed or impossible pool counters', () => {
        expect(readDatabasePoolStats({ totalCount: -1, idleCount: 0, waitingCount: 0 })).toBeNull()
        expect(readDatabasePoolStats({ totalCount: 2, idleCount: 3, waitingCount: 0 })).toBeNull()
        expect(readDatabasePoolStats({ totalCount: 2.5, idleCount: 1, waitingCount: 0 })).toBeNull()
        expect(readDatabasePoolStats(null)).toBeNull()
    })
})

describe('database pool pressure', () => {
    it('reports active and waiting pressure independently', () => {
        expect(evaluateDatabasePoolPressure({
            total: 10,
            idle: 1,
            active: 9,
            waiting: 3,
        }, {
            maxActiveRatio: 0.8,
            maxWaitingRequests: 2,
        })).toEqual({
            ok: false,
            activeRatio: 0.9,
            reasons: ['active_ratio_exceeded', 'waiting_requests_exceeded'],
        })
    })
})
