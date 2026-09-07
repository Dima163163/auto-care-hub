import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AutoCareChatReport } from '@/entities/automotive-service'

import { AdminChatReportsPanel } from './AdminChatReportsPanel'

const mocks = vi.hoisted(() => ({ decide: vi.fn() }))

const report = {
    id: 'report-1',
    threadId: 'thread-1',
    reporterId: 'client-1',
    reportedUserId: null,
    category: 'spam',
    description: null,
    status: 'pending',
    reviewedById: null,
    resolutionReason: null,
    createdAt: '2026-09-08T10:00:00.000Z',
    reviewedAt: null,
} as AutoCareChatReport

vi.mock('@/entities/automotive-service', () => ({
    useGetAdminAutoCareChatReportsQuery: () => ({ data: [report], isLoading: false, error: null, refetch: vi.fn() }),
    useDecideAdminAutoCareChatReportMutation: () => [mocks.decide, { isLoading: false, error: null }],
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        locale: 'ru',
        t: (key: string) => ({
            'adminChatReports.title': 'Жалобы на чаты',
            'adminChatReports.description': 'Проверяйте сообщения и вложения.',
            'adminChatReports.filter': 'Статус жалоб',
            'adminChatReports.all': 'Все',
            'adminChatReports.pending': 'Ожидают',
            'adminChatReports.resolved': 'Решены',
            'adminChatReports.dismissed': 'Отклонены',
            'adminChatReports.empty': 'Жалоб нет.',
            'adminChatReports.category': 'Причина',
            'adminChatReports.reporter': 'Заявитель',
            'adminChatReports.reported': 'Участник',
            'adminChatReports.created': 'Создана',
            'adminChatReports.descriptionLabel': 'Комментарий',
            'adminChatReports.openChat': 'Открыть чат',
            'adminChatReports.decisionReason': 'Комментарий решения',
            'adminChatReports.placeholder': 'Опишите решение…',
            'adminChatReports.required': 'Добавьте комментарий перед сохранением решения.',
            'adminChatReports.block': 'Заблокировать участника в этом чате',
            'adminChatReports.resolve': 'Решить',
            'adminChatReports.dismiss': 'Отклонить',
            'adminChatReports.saved': 'Решение сохранено',
            'adminChatReports.failedDecision': 'Не удалось сохранить решение.',
            'adminChatReports.failed': 'Не удалось загрузить жалобы.',
            'adminChatReports.categories.spam': 'Спам',
            'adminChatReports.categories.harassment': 'Оскорбления',
            'adminChatReports.categories.fraud': 'Мошенничество',
            'adminChatReports.categories.unsafe': 'Небезопасно',
            'adminChatReports.categories.other': 'Другое',
            'adminChatReports.statuses.pending': 'Ожидает',
            'adminChatReports.statuses.resolved': 'Решена',
            'adminChatReports.statuses.dismissed': 'Отклонена',
            'common.loading': 'Загрузка',
            'common.retry': 'Повторить',
            'common.notProvided': 'Не указано',
        }[key] ?? key),
    }),
}))

describe('AdminChatReportsPanel', () => {
    beforeEach(() => {
        mocks.decide.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue(report) }))
    })

    it('renders localized report details and announces required decision notes', async () => {
        const user = userEvent.setup()
        render(<MemoryRouter><AdminChatReportsPanel /></MemoryRouter>)

        expect(screen.getByRole('heading', { name: 'Жалобы на чаты' })).toBeVisible()
        expect(screen.getByText('Спам')).toBeVisible()
        expect(screen.getByText(/Не указано/)).toBeVisible()
        await user.click(screen.getByRole('button', { name: 'Решить' }))

        expect(screen.getByRole('alert')).toHaveTextContent('Добавьте комментарий перед сохранением решения.')
        expect(mocks.decide).not.toHaveBeenCalled()
    })

    it('preserves the decision payload with the participant block choice', async () => {
        const user = userEvent.setup()
        render(<MemoryRouter><AdminChatReportsPanel /></MemoryRouter>)

        await user.type(screen.getByPlaceholderText('Опишите решение…'), 'Проверено')
        await user.click(screen.getByRole('checkbox'))
        await user.click(screen.getByRole('button', { name: 'Решить' }))

        expect(mocks.decide).toHaveBeenCalledWith({ id: 'report-1', status: 'resolved', reason: 'Проверено', blockUser: true })
    })
})
