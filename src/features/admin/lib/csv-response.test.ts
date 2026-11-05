import { describe, expect, it } from 'vitest'

import { readCsvOrApiError } from './csv-response'

describe('CSV export response handling', () => {
    it('keeps a CSV success as a Blob and a step-up denial as a structured error', async () => {
        const csv = await readCsvOrApiError(new Response('id,action\n1,test', { status: 200 }))
        expect(csv).toMatchObject({ size: 16 })
        expect(await (csv as Blob).text()).toContain('id,action')

        const denied = await readCsvOrApiError(new Response(
            JSON.stringify({ code: 'MFA_STEP_UP_REQUIRED' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } },
        ))
        expect(denied).toEqual({ code: 'MFA_STEP_UP_REQUIRED' })
    })
})
