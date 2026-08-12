import { describe, expect, it } from 'vitest'

import {
    MAX_EXTERNAL_JSON_RESPONSE_BYTES,
    readJsonResponse,
} from './read-json-response.js'

describe('bounded JSON response reader', () => {
    it('reads valid bounded JSON', async () => {
        await expect(readJsonResponse<{ ok: boolean }>(new Response('{"ok":true}')))
            .resolves.toEqual({ ok: true })
    })

    it('rejects declared, actual, and malformed oversized responses', async () => {
        await expect(readJsonResponse(new Response('{}', {
            headers: { 'content-length': String(MAX_EXTERNAL_JSON_RESPONSE_BYTES + 1) },
        }))).rejects.toThrow(/too large/)
        await expect(readJsonResponse(new Response('x'.repeat(20), undefined), 10))
            .rejects.toThrow(/too large/)
        await expect(readJsonResponse(new Response('not-json'))).rejects.toThrow(/valid JSON/)
    })
})
