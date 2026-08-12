import { describe, expect, it, vi } from 'vitest'

import { registerNotFoundHandler } from './not-found-handler.js'

describe('not-found handler', () => {
    it('does not echo query parameters in the public error message', () => {
        const setNotFoundHandler = vi.fn()
        registerNotFoundHandler({ setNotFoundHandler } as never)

        const [handler] = setNotFoundHandler.mock.calls[0] as [
            (request: { id: string; method: string; url: string }, reply: {
                send: (body: unknown) => unknown
                status: (statusCode: number) => { send: (body: unknown) => unknown }
            }) => unknown,
        ]
        const send = vi.fn()
        const reply = {
            send,
            status: vi.fn(() => ({ send })),
        }

        handler({
            id: 'request-123',
            method: 'GET',
            url: '/missing?token=secret-value',
        }, reply)

        expect(reply.status).toHaveBeenCalledWith(404)
        expect(send).toHaveBeenCalledWith({
            statusCode: 404,
            code: 'NOT_FOUND',
            message: 'The requested resource was not found.',
            requestId: 'request-123',
        })
    })
})
