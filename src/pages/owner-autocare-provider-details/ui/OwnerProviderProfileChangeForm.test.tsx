import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AutoCareApiProvider } from '@/entities/automotive-service'

import { OwnerProviderProfileChangeForm } from './OwnerProviderProfileChangeForm'

const mockAccount = vi.hoisted(() => ({ id: 'owner-a' }))

vi.mock('@/features/auth', () => ({
    useGetMeQuery: () => ({ data: { id: mockAccount.id } }),
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        t: (key: string) => ({
            'autocare.ownerProviderProfileSubmit': 'Отправить изменение на проверку',
        }[key] ?? key),
    }),
}))

const provider = {
    id: 'provider-1',
    name: 'ProService',
    description: 'Service',
    phones: ['+79990000000'],
    email: 'service@example.com',
    websiteUrl: null,
    metroStation: null,
    warrantyText: null,
    yearsActive: 10,
    staffCount: 2,
    workstationCount: 2,
    brandSpecializations: ['Toyota'],
    isMultibrand: false,
} as AutoCareApiProvider

describe('OwnerProviderProfileChangeForm', () => {
    beforeEach(() => {
        mockAccount.id = 'owner-a'
        localStorage.clear()
    })

    it('restores only the current account draft for the same provider', async () => {
        const user = userEvent.setup()
        const props = { provider, disabled: false, onSubmit: vi.fn() }
        localStorage.setItem('autocare-owner-profile-change:provider-1', 'legacy shared draft')
        const { rerender } = render(<OwnerProviderProfileChangeForm {...props} />)
        expect(localStorage.getItem('autocare-owner-profile-change:provider-1')).toBeNull()

        const name = screen.getByDisplayValue('ProService')
        await user.clear(name)
        await user.type(name, 'Owner A draft')
        await waitFor(() => expect(localStorage.getItem('autocare-owner-profile-change:owner-a:provider-1')).not.toBeNull())

        mockAccount.id = 'owner-b'
        rerender(<OwnerProviderProfileChangeForm {...props} />)

        expect(screen.getByDisplayValue('ProService')).toBeInTheDocument()
        expect(localStorage.getItem('autocare-owner-profile-change:owner-b:provider-1')).toBeNull()
    })

    it('preserves the draft when the profile change request is rejected', async () => {
        const user = userEvent.setup()
        const onSubmit = vi.fn().mockRejectedValue(new Error('temporary failure'))
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            render(<OwnerProviderProfileChangeForm provider={provider} disabled={false} onSubmit={onSubmit} />)

            const name = screen.getByDisplayValue('ProService')
            await user.clear(name)
            await user.type(name, 'Updated ProService')
            await user.click(screen.getByRole('button', { name: 'Отправить изменение на проверку' }))

            expect(onSubmit).toHaveBeenCalledOnce()
            expect(name).toHaveValue('Updated ProService')
            expect(unhandled).toEqual([])
        } finally {
            process.off('unhandledRejection', onUnhandled)
        }
    })
})
