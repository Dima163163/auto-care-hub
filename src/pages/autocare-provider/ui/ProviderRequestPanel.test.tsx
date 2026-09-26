import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router'

import { I18nContext } from '@/shared/lib/i18n-context'

import { ProviderRequestPanel } from './ProviderRequestPanel'

const mocks = vi.hoisted(() => ({
    createChat: vi.fn(),
    sendMessage: vi.fn(),
    createAttachment: vi.fn(),
}))

vi.mock('@/entities/automotive-service', () => ({
    automotiveServices: [],
    getServiceLabel: () => 'Service',
    useCreateAutoCareChatAttachmentMutation: () => [mocks.createAttachment, { isLoading: false, isError: false }],
    useCreateAutoCareChatMessageMutation: () => [mocks.sendMessage, { isLoading: false, isError: false }],
    useCreateAutoCareChatMutation: () => [mocks.createChat, { isLoading: false, isError: false }],
    useGetAutoCareAvailabilityQuery: () => ({ data: { slots: [] }, isLoading: false, isFetching: false, isError: false }),
    useGetMyAutoCareFleetsQuery: () => ({ data: [] }),
}))

vi.mock('@/features/auth', () => ({
    useGetMeQuery: () => ({ data: { id: 'client-1', role: 'client', emailVerifiedAt: '2026-01-01T00:00:00.000Z' } }),
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({ locale: 'en', t: (key: string) => key }),
}))

function LocationProbe() {
    const location = useLocation()
    return <output data-testid="location">{location.pathname}{location.search}</output>
}

function renderPanel() {
    return render(
        <I18nContext.Provider value={{ locale: 'en', setLocale: vi.fn(), t: (key) => key }}>
            <MemoryRouter>
                <ProviderRequestPanel
                    provider={{ id: 'provider-1', communicationMode: 'request_then_confirm', chatEnabled: true, phones: [], phone: null } as never}
                    offering={{ id: 'offering-1', serviceId: 'oil-change' } as never}
                />
                <LocationProbe />
            </MemoryRouter>
        </I18nContext.Provider>,
    )
}

describe('ProviderRequestPanel generic chat submission', () => {
    beforeEach(() => {
        mocks.createChat.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({ id: 'thread-1' }) }))
        mocks.sendMessage.mockReset()
        mocks.createAttachment.mockReset()
    })

    it('reuses the same thread and idempotency key after a failed message response', async () => {
        const user = userEvent.setup()
        mocks.sendMessage
            .mockImplementationOnce(() => ({ unwrap: vi.fn().mockRejectedValue(new Error('response lost')) }))
            .mockImplementationOnce(() => ({ unwrap: vi.fn().mockResolvedValue({ id: 'message-1' }) }))
        renderPanel()

        await user.click(screen.getByRole('button', { name: /autocare\.providerRequestTitle/ }))
        await user.type(screen.getByPlaceholderText('autocare.providerMessagePlaceholder'), 'I need an estimate')
        const submit = screen.getByRole('button', { name: 'autocare.providerSendRequest' })
        await user.click(submit)
        await user.click(submit)

        expect(mocks.createChat).toHaveBeenCalledTimes(1)
        const first = mocks.sendMessage.mock.calls[0]?.[0]
        const retry = mocks.sendMessage.mock.calls[1]?.[0]
        expect(first).toMatchObject({ chatId: 'thread-1', body: 'I need an estimate', idempotencyKey: expect.any(String) })
        expect(retry).toEqual(first)
        expect(await screen.findByTestId('location')).toHaveTextContent('/chats?chat=thread-1')
    })

    it('keeps failed photos retryable without sending the request message twice', async () => {
        const user = userEvent.setup()
        mocks.sendMessage.mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({ id: 'message-1' }) }))
        mocks.createAttachment
            .mockImplementationOnce(() => ({ unwrap: vi.fn().mockRejectedValue(new Error('upload failed')) }))
            .mockImplementationOnce(() => ({ unwrap: vi.fn().mockResolvedValue({ id: 'attachment-1' }) }))
        renderPanel()

        await user.click(screen.getByRole('button', { name: /autocare\.providerRequestTitle/ }))
        await user.type(screen.getByPlaceholderText('autocare.providerMessagePlaceholder'), 'Brake noise')
        await user.upload(screen.getByLabelText('autocare.providerAttachPhoto'), new File(['image'], 'brakes.png', { type: 'image/png' }))
        await user.click(screen.getByRole('button', { name: 'autocare.providerSendRequest' }))

        expect(await screen.findByText('autocare.chatUploadError (1)')).toBeVisible()
        expect(screen.getByTestId('location')).toHaveTextContent('/')
        expect(mocks.sendMessage).toHaveBeenCalledTimes(1)

        await user.click(screen.getByRole('button', { name: 'autocare.providerRetryAttachments' }))

        await waitFor(() => {
            expect(mocks.createChat).toHaveBeenCalledTimes(1)
            expect(mocks.sendMessage).toHaveBeenCalledTimes(1)
            expect(mocks.createAttachment).toHaveBeenCalledTimes(2)
            expect(screen.getByTestId('location')).toHaveTextContent('/chats?chat=thread-1')
        })
    })
})
