import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { AutoCareApiProvider } from '@/entities/automotive-service'

import { OwnerProviderProfileChangeForm } from './OwnerProviderProfileChangeForm'

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
    it('preserves the draft when the profile change request is rejected', async () => {
        const user = userEvent.setup()
        const onSubmit = vi.fn().mockRejectedValue(new Error('temporary failure'))
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            render(<OwnerProviderProfileChangeForm provider={provider} locale="ru" disabled={false} onSubmit={onSubmit} />)

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
