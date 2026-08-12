import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { parseMockJson } from './parseMockJson'

describe('parseMockJson', () => {
    const schema = z.object({ email: z.string().email() })

    it('parses a valid JSON body through the supplied schema', async () => {
        await expect(
            parseMockJson(
                new Request('http://localhost', {
                    method: 'POST',
                    body: JSON.stringify({ email: 'client@example.com' }),
                }),
                schema,
            ),
        ).resolves.toEqual({ email: 'client@example.com' })
    })

    it('returns undefined for malformed JSON or shape', async () => {
        await expect(
            parseMockJson(
                new Request('http://localhost', {
                    method: 'POST',
                    body: '{broken',
                }),
                schema,
            ),
        ).resolves.toBeUndefined()

        await expect(
            parseMockJson(
                new Request('http://localhost', {
                    method: 'POST',
                    body: JSON.stringify({ email: 'not-an-email' }),
                }),
                schema,
            ),
        ).resolves.toBeUndefined()
    })
})
