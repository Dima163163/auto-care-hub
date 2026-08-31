import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OwnerFleetPanel } from './OwnerFleetPanel'

const createFleet = vi.hoisted(() => vi.fn())

vi.mock('@/entities/automotive-service', () => ({
    useCreateAutoCareFleetMutation: () => [createFleet, { isLoading: false }],
    useGetMyAutoCareFleetsQuery: () => ({ data: [], isLoading: false }),
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({ locale: 'ru', t: (key: string) => key }),
}))

vi.mock('./OwnerFleetVehicleForm', () => ({
    OwnerFleetVehicleForm: () => null,
}))

describe('OwnerFleetPanel', () => {
    beforeEach(() => {
        createFleet.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockRejectedValue({ data: { message: 'Автопарк уже существует.' } }),
        }))
    })

    it('keeps the fleet name and exposes a retryable error when creation fails', async () => {
        const user = userEvent.setup()
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            render(<OwnerFleetPanel />)
            const name = screen.getByPlaceholderText('Название автопарка')
            await user.type(name, 'Корпоративный парк')
            await user.click(screen.getByRole('button', { name: 'Добавить автопарк' }))

            expect(await screen.findByRole('alert')).toHaveTextContent('Автопарк уже существует.')
            expect(name).toHaveValue('Корпоративный парк')
            expect(unhandled).toEqual([])
        } finally {
            process.off('unhandledRejection', onUnhandled)
        }
    })
})
