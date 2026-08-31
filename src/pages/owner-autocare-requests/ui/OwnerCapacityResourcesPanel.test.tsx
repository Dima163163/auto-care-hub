import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OwnerCapacityResourcesPanel } from './OwnerCapacityResourcesPanel'

const mocks = vi.hoisted(() => ({
    create: vi.fn(),
    update: vi.fn(),
    resources: [] as Array<{ id: string; providerId: string; locationId: string; type: 'specialist'; name: string; capacity: number; active: boolean; metadata: Record<string, unknown>; createdAt: string; updatedAt: string }>,
}))

vi.mock('@/entities/automotive-service', () => ({
    useCreateOwnerAutoCareCapacityResourceMutation: () => [mocks.create, { isLoading: false, error: null }],
    useUpdateOwnerAutoCareCapacityResourceMutation: () => [mocks.update, { isLoading: false }],
    useGetOwnerAutoCareCapacityResourcesQuery: () => ({ data: mocks.resources, isLoading: false, isError: false }),
    useGetOwnerAutoCareCapacityReservationsQuery: () => ({ data: [], isLoading: false, isFetching: false, isError: false }),
}))

describe('OwnerCapacityResourcesPanel', () => {
    beforeEach(() => {
        mocks.resources = []
        mocks.create.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockRejectedValue({ data: { message: 'Ресурс уже существует.' } }) }))
        mocks.update.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockRejectedValue({ data: { message: 'Ресурс уже изменён.' } }) }))
    })

    it('keeps a rejected resource draft and exposes a retryable error', async () => {
        const user = userEvent.setup()
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            render(<OwnerCapacityResourcesPanel providerId="provider-1" locationId="location-1" selectedDay={new Date('2026-08-30T10:00:00.000Z')} locale="ru" />)
            const name = screen.getByRole('textbox', { name: 'Название ресурса' })
            await user.type(name, 'Пост 1')
            await user.click(screen.getByRole('button', { name: 'Добавить' }))

            expect(await screen.findByRole('alert')).toHaveTextContent('Ресурс уже существует.')
            expect(name).toHaveValue('Пост 1')
            expect(unhandled).toEqual([])
        } finally {
            process.off('unhandledRejection', onUnhandled)
        }
    })

    it('surfaces a rejected resource toggle without an unhandled rejection', async () => {
        const user = userEvent.setup()
        mocks.resources = [{ id: 'resource-1', providerId: 'provider-1', locationId: 'location-1', type: 'specialist', name: 'Специалист 1', capacity: 1, active: true, metadata: {}, createdAt: '2026-08-29T10:00:00.000Z', updatedAt: '2026-08-29T10:00:00.000Z' }]
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            render(<OwnerCapacityResourcesPanel providerId="provider-1" locationId="location-1" selectedDay={new Date('2026-08-30T10:00:00.000Z')} locale="ru" />)
            await user.click(screen.getByRole('button', { name: /Специалист 1 · 1/ }))

            expect(await screen.findByRole('alert')).toHaveTextContent('Ресурс уже изменён.')
            expect(unhandled).toEqual([])
        } finally {
            process.off('unhandledRejection', onUnhandled)
        }
    })
})
