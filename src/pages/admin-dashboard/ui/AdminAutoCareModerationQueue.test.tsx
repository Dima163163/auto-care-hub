import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AdminAutoCareProvider } from '@/entities/automotive-service'

import { AdminAutoCareModerationQueue } from './AdminAutoCareModerationQueue'

const mocks = vi.hoisted(() => ({ updateStatus: vi.fn() }))

const providers = [{
    id: 'provider-1',
    name: 'ProService',
    logoUrl: null,
    verified: true,
    status: 'draft',
    ownerName: null,
    trustScore: 92,
    location: { address: 'Moscow' },
}] as unknown as AdminAutoCareProvider[]

vi.mock('@/entities/automotive-service', () => ({
    ProviderLogo: ({ name }: { name: string }) => <span>{name}</span>,
    useUpdateAdminAutoCareProviderStatusMutation: () => [mocks.updateStatus, { isLoading: false }],
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        locale: 'ru',
        t: (key: string) => ({
            'adminProviderModeration.title': 'Модерация сервисов',
            'adminProviderModeration.description': 'Публикуйте сервис только если профиль заполнен.',
            'adminProviderModeration.owner': 'Владелец',
            'adminProviderModeration.trust': 'Индекс доверия',
            'adminProviderModeration.publish': 'Опубликовать',
            'adminProviderModeration.suspend': 'Приостановить',
            'adminProviderModeration.draft': 'В черновик',
            'adminProviderModeration.active': 'Опубликован',
            'adminProviderModeration.pending': 'Черновик',
            'adminProviderModeration.suspended': 'Приостановлен',
            'adminProviderModeration.empty': 'Нет профилей.',
            'common.notProvided': 'Не указано',
        }[key] ?? key),
    }),
}))

describe('AdminAutoCareModerationQueue', () => {
    beforeEach(() => {
        mocks.updateStatus.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({}) }))
    })

    it('renders localized moderation labels and preserves the publish status mutation', async () => {
        const user = userEvent.setup()
        render(<AdminAutoCareModerationQueue locale="ru" providers={providers} />)

        expect(screen.getByRole('heading', { name: 'Модерация сервисов' })).toBeVisible()
        expect(screen.getByText('92/100')).toBeVisible()
        await user.click(screen.getByRole('button', { name: 'Опубликовать' }))

        expect(mocks.updateStatus).toHaveBeenCalledWith({ id: 'provider-1', status: 'active' })
    })
})
