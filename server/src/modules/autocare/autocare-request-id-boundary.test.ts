import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
    transaction: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import {
    acceptAutoCareServiceQuote,
    cancelAutoCareServiceRequest,
    completeAutoCareServiceRequest,
    confirmAutoCareServiceRequest,
    confirmOwnerAutoCareServiceRequest,
    createAutoCareServiceAttachment,
    createAutoCareServiceMessage,
    createAutoCareServiceOffer,
    createAutoCareServiceQuote,
    declineAutoCareServiceQuote,
    decideAutoCareServiceOffer,
    decideAutoCareServiceReschedule,
    getAutoCareServiceAttachment,
    getAutoCareServiceRequest,
    getAutoCareServiceRequestConversation,
    markAutoCareServiceConversationRead,
    markAutoCareServiceRequestNoShow,
    requestAutoCareServiceReschedule,
} from './autocare-request.service.js'

const owner = { id: 'owner-1', role: 'owner' } as never
const client = { id: 'client-1', role: 'client' } as never

describe('service request identifier boundary', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
        mocks.transaction.mockReset()
    })

    it('rejects malformed request ids before repository access or transactions', async () => {
        const calls: Promise<unknown>[] = [
            getAutoCareServiceRequestConversation(client, 'request-1'),
            createAutoCareServiceMessage(client, 'request-1', { body: 'Hello there' }),
            createAutoCareServiceOffer(owner, 'request-1', { type: 'discount', title: 'Offer', discountPercent: 10 }),
            createAutoCareServiceQuote(owner, 'request-1', { amountMinor: 2_500, currencyCode: 'RUB' }),
            getAutoCareServiceRequest(client, 'request-1'),
            confirmAutoCareServiceRequest(client, 'request-1'),
            confirmOwnerAutoCareServiceRequest(owner, 'request-1'),
            markAutoCareServiceConversationRead(client, 'request-1'),
            createAutoCareServiceAttachment(client, 'request-1', { contentType: 'image/jpeg', bytes: 'AQ==' } as never),
            getAutoCareServiceAttachment(client, 'request-1', 'attachment-1'),
            requestAutoCareServiceReschedule(owner, 'request-1', { proposedAt: '2026-09-01T10:00:00.000Z' }),
            decideAutoCareServiceReschedule(client, 'request-1', 'accept'),
            markAutoCareServiceRequestNoShow(owner, 'request-1'),
            completeAutoCareServiceRequest(owner, 'request-1'),
            cancelAutoCareServiceRequest(client, 'request-1'),
        ]
        for (const call of calls) await expect(call).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
        expect(mocks.transaction).not.toHaveBeenCalled()
    })

    it('rejects malformed quote decision request ids before opening a transaction', async () => {
        await expect(acceptAutoCareServiceQuote(client, 'request-1')).rejects.toMatchObject({ statusCode: 422 })
        await expect(declineAutoCareServiceQuote(client, 'request-1')).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
        expect(mocks.transaction).not.toHaveBeenCalled()
    })

    it('rejects malformed message and attachment ids before participant lookup', async () => {
        await expect(decideAutoCareServiceOffer(client, '11111111-1111-4111-8111-111111111111', 'message-1', 'accept')).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAutoCareServiceAttachment(client, '11111111-1111-4111-8111-111111111111', 'attachment-1')).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('rejects malformed offer decisions before opening a transaction', async () => {
        await expect(decideAutoCareServiceOffer(client, '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'accept ' as never)).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
        expect(mocks.transaction).not.toHaveBeenCalled()
    })

    it('rejects malformed conversation pagination before participant lookup', async () => {
        const requestId = '11111111-1111-4111-8111-111111111111'
        await expect(getAutoCareServiceRequestConversation(client, requestId, null as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAutoCareServiceRequestConversation(client, requestId, { cursor: 'a', beforeCursor: 'b' })).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAutoCareServiceRequestConversation(client, requestId, { limit: '50' } as never)).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('rejects malformed service message payloads before participant lookup', async () => {
        const requestId = '11111111-1111-4111-8111-111111111111'
        await expect(createAutoCareServiceMessage(client, requestId, null as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareServiceMessage(client, requestId, { body: 'Hello there', unexpected: true } as never)).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('keeps client-only authorization ahead of request-id validation', async () => {
        await expect(confirmAutoCareServiceRequest(owner, 'request-1')).rejects.toMatchObject({ statusCode: 403 })
        await expect(decideAutoCareServiceOffer(owner, 'request-1', 'message-1', 'accept')).rejects.toMatchObject({ statusCode: 403 })
        await expect(decideAutoCareServiceReschedule(owner, 'request-1', 'accept')).rejects.toMatchObject({ statusCode: 403 })
        await expect(cancelAutoCareServiceRequest(owner, 'request-1')).rejects.toMatchObject({ statusCode: 403 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
        expect(mocks.transaction).not.toHaveBeenCalled()
    })
})
