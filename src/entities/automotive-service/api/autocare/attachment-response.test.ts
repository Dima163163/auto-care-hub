import { describe, expect, it } from 'vitest'

import { readAttachmentOrApiError } from './attachment-response'

describe('private attachment response', () => {
    it('keeps a successful image as a Blob and a step-up denial as structured data', async () => {
        const image = new Blob(['image-bytes'], { type: 'image/png' })
        const success = await readAttachmentOrApiError(new Response(image, { status: 200 }))
        expect(success).toBeInstanceOf(Blob)

        const denied = await readAttachmentOrApiError(new Response(
            JSON.stringify({ code: 'MFA_STEP_UP_REQUIRED' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } },
        ))
        expect(denied).toEqual({ code: 'MFA_STEP_UP_REQUIRED' })
    })
})
