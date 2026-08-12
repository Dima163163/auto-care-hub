import { afterEach, describe, expect, it } from 'vitest'

import { metrics } from './metrics.js'
import {
    buildExternalErrorReport,
    reportExternalErrorSafely,
    setExternalErrorReporter,
} from './error-reporter.js'

afterEach(() => {
    setExternalErrorReporter(null)
    metrics.reset()
})

describe('external error reporter', () => {
    it('builds a redacted report with bounded diagnostics', () => {
        expect(buildExternalErrorReport(new Error('token=secret'), {
            requestId: 'request-1',
            headers: { authorization: 'Bearer secret' },
        })).toEqual({
            error: { name: 'Error', message: '[REDACTED_ERROR_MESSAGE]' },
            context: {
                requestId: 'request-1',
                headers: { authorization: '[REDACTED]' },
            },
        })
    })

    it('keeps unknown errors safe', () => {
        expect(buildExternalErrorReport('not-an-error')).toEqual({
            error: { name: 'UnknownError' },
            context: {},
        })
    })

    it('records bounded reporter outcomes without leaking error labels', async () => {
        setExternalErrorReporter({
            report: async () => {
                throw new Error('provider unavailable')
            },
        })

        await reportExternalErrorSafely(new Error('provider failure'))

        expect(metrics.snapshot().counters).toContainEqual(expect.objectContaining({
            name: 'external_error_reports_total',
            labels: { outcome: 'failed' },
            value: 1,
        }))
    })
})
