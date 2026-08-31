import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

import { ExpertQuestionCard } from './ExpertQuestionCard'
import { MultiProviderRequestCard } from './MultiProviderRequestCard'

const mocks = vi.hoisted(() => ({
    createQuestion: vi.fn(),
    createRequest: vi.fn(),
}))

vi.mock('@/entities/automotive-service', () => ({
    useCreateAutoCareExpertQuestionMutation: () => [mocks.createQuestion, { isLoading: false, isSuccess: false, isError: true, error: { data: { message: 'Экспертная консультация временно недоступна.' } } }],
    useCreateAutoCareBroadcastRequestMutation: () => [mocks.createRequest, { isLoading: false, isSuccess: false, isError: true, error: { data: { message: 'Рассылка заявок временно недоступна.' } } }],
}))

vi.mock('@/features/auth', () => ({
    useGetMeQuery: () => ({ data: { id: 'client-1', emailVerifiedAt: '2026-08-01T10:00:00.000Z' } }),
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({ locale: 'ru', t: (key: string) => key }),
}))

function renderInRouter(ui: React.ReactNode) {
    return render(<MemoryRouter initialEntries={['/results']}>{ui}</MemoryRouter>)
}

describe('result request cards', () => {
    beforeEach(() => {
        mocks.createQuestion.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockRejectedValue(new Error('question failed')) }))
        mocks.createRequest.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockRejectedValue(new Error('broadcast failed')) }))
    })

    it('keeps an expert question draft and exposes the API error without an unhandled rejection', async () => {
        const user = userEvent.setup()
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            renderInRouter(<ExpertQuestionCard categorySlug="brakes" />)
            const symptoms = screen.getByRole('textbox', { name: '' })
            await user.type(symptoms, 'Странный шум при торможении')
            await user.click(screen.getByRole('button', { name: 'autocare.expertQuestionSend' }))

            expect(await screen.findByRole('alert')).toHaveTextContent('Экспертная консультация временно недоступна.')
            expect(symptoms).toHaveValue('Странный шум при торможении')
            expect(unhandled).toEqual([])
        } finally {
            process.off('unhandledRejection', onUnhandled)
        }
    })

    it('keeps a multi-provider request draft and announces a rejected request', async () => {
        const user = userEvent.setup()
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            renderInRouter(<MultiProviderRequestCard serviceDefinitionId="brakes" marketId="moscow" />)
            await user.click(screen.getByRole('button', { name: 'autocare.multiProviderOpen' }))
            const description = screen.getByRole('textbox', { name: '' })
            await user.type(description, 'Нужна диагностика и замена колодок')
            await user.click(screen.getByRole('button', { name: 'autocare.multiProviderSubmit' }))

            expect(await screen.findByRole('alert')).toHaveTextContent('Рассылка заявок временно недоступна.')
            expect(description).toHaveValue('Нужна диагностика и замена колодок')
            expect(unhandled).toEqual([])
        } finally {
            process.off('unhandledRejection', onUnhandled)
        }
    })
})
