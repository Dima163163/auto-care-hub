import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AutoCareApiProvider } from '@/entities/automotive-service'

import { OwnerProviderBonusPanel } from './OwnerProviderBonusPanel'

const mocks = vi.hoisted(() => ({
    grant: vi.fn(),
    refetch: vi.fn(),
}))

vi.mock('@/entities/automotive-service', () => ({
    useGetOwnerAutoCareBonusLiabilityQuery: () => ({
        data: { activeAccounts: 2, liabilityPoints: 180, entries: [] },
        isLoading: false,
        error: null,
        refetch: mocks.refetch,
    }),
    useGrantAutoCareBonusMutation: () => [mocks.grant, { isLoading: false, error: null }],
}))

vi.mock('@/entities/user', () => ({
    useGetOwnerClientsQuery: () => ({
        data: [{ id: 'client-1', name: 'Alex Client', phone: '+79990000000', email: 'alex@example.com' }],
        isLoading: false,
        error: null,
    }),
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        locale: 'ru',
        t: (key: string) => ({
            'autocare.ownerProviderBonusClient': 'Клиент',
            'autocare.ownerProviderBonusChooseClient': 'Выберите клиента',
            'autocare.ownerProviderBonusGrant': 'Начислить бонус',
            'autocare.ownerProviderBonusPoints': 'Баллы',
            'autocare.ownerProviderBonusReason': 'Причина',
            'autocare.ownerProviderBonusReasonPlaceholder': 'Например: компенсация после визита',
        }[key] ?? key),
    }),
}))

const provider = { id: 'provider-1' } as AutoCareApiProvider

describe('OwnerProviderBonusPanel', () => {
    beforeEach(() => {
        mocks.grant.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({}) }))
        mocks.refetch.mockReset().mockResolvedValue(undefined)
    })

    it('keeps the manual bonus payload scoped to the provider and client', async () => {
        const user = userEvent.setup()
        render(<OwnerProviderBonusPanel provider={provider} />)

        await user.selectOptions(screen.getByRole('combobox'), 'client-1')
        await user.type(screen.getByRole('spinbutton'), '120')
        await user.type(screen.getByRole('textbox', { name: 'Причина' }), 'Компенсация после визита')
        await user.click(screen.getByRole('button', { name: 'Начислить бонус' }))

        expect(mocks.grant).toHaveBeenCalledWith({
            providerId: 'provider-1',
            clientId: 'client-1',
            points: 120,
            reason: 'Компенсация после визита',
            idempotencyKey: expect.stringMatching(/^manual-provider-1-client-1-/),
        })
        expect(mocks.refetch).toHaveBeenCalledOnce()
    })
})
