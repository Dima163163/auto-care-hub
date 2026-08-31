import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GuaranteeClaimCard } from './GuaranteeClaimCard'

const createClaim = vi.hoisted(() => vi.fn())

vi.mock('@/entities/automotive-service', () => ({
    useCreateAutoCareGuaranteeClaimMutation: () => [createClaim, { isLoading: false, isSuccess: false }],
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({ locale: 'ru', t: (key: string) => key }),
}))

describe('GuaranteeClaimCard', () => {
    beforeEach(() => {
        createClaim.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockRejectedValue({ data: { message: 'Обращение уже существует.' } }),
        }))
    })

    it('keeps a rejected claim draft and exposes a retryable error', async () => {
        const user = userEvent.setup()
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            render(<GuaranteeClaimCard requestId="request-1" />)

            const summary = screen.getByPlaceholderText('Что нужно исправить?')
            await user.type(summary, 'После визита осталась проблема с тормозами.')
            await user.click(screen.getByRole('button', { name: 'Создать обращение' }))

            expect(await screen.findByRole('alert')).toHaveTextContent('Обращение уже существует.')
            expect(summary).toHaveValue('После визита осталась проблема с тормозами.')
            expect(unhandled).toEqual([])
        } finally {
            process.off('unhandledRejection', onUnhandled)
        }
    })
})
