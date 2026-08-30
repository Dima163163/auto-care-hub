import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { AutoCareApiProvider } from '@/entities/automotive-service'

import { OwnerProviderCommunicationSettings } from './OwnerProviderCommunicationSettings'

const mocks = vi.hoisted(() => ({
    update: vi.fn(() => ({ unwrap: vi.fn().mockRejectedValue(new Error('temporary failure')) })),
}))

vi.mock('@/entities/automotive-service', () => ({
    useUpdateOwnerAutoCareCommunicationSettingsMutation: () => [mocks.update, { isLoading: false, isSuccess: false, error: { status: 503, data: { message: 'temporary failure' } } }],
}))

const provider = {
    id: 'provider-1',
    teamSize: 'small_team',
    businessType: 'company',
    chatEnabled: true,
    communicationMode: 'online',
    responseWindowMinutes: 240,
    responseHours: 'working_hours',
    phoneBookingEnabled: true,
    callbackEnabled: true,
    requestPhotosEnabled: true,
    publicContactNote: null,
} as AutoCareApiProvider

describe('OwnerProviderCommunicationSettings', () => {
    it('keeps the settings form usable after a rejected save', async () => {
        const user = userEvent.setup()
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            render(<OwnerProviderCommunicationSettings provider={provider} locale="ru" />)

            await user.click(screen.getByRole('button', { name: 'Сохранить режим связи' }))

            expect(await screen.findByRole('alert')).toHaveTextContent('temporary failure')
            expect(screen.getByRole('button', { name: 'Сохранить режим связи' })).toBeEnabled()
            expect(unhandled).toEqual([])
        } finally {
            process.off('unhandledRejection', onUnhandled)
        }
    })
})
