import { describe, expect, it } from 'vitest'

import { readAttachmentOrApiError } from './attachment-response'

describe('private attachment response', () => {
    it('keeps a successful image as a Blob and a step-up denial as structured data', async () => {
        const success = await readAttachmentOrApiError(new Response('image-bytes', {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
        }))
        expect(success).toMatchObject({ size: 11, type: 'image/png' })
        expect(await (success as Blob).text()).toBe('image-bytes')

        const denied = await readAttachmentOrApiError(new Response(
            JSON.stringify({ code: 'MFA_STEP_UP_REQUIRED' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } },
        ))
        expect(denied).toEqual({ code: 'MFA_STEP_UP_REQUIRED' })
    })
})
