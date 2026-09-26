import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AutoCareChatReport } from '@/entities/automotive-service'

import { AdminChatReportsPanel } from './AdminChatReportsPanel'

const mocks = vi.hoisted(() => ({
    role: 'super_admin' as 'admin' | 'super_admin',
    userId: 'super-1',
    reports: [] as AutoCareChatReport[],
    nextCursor: null as string | null,
    reportQueries: [] as unknown[],
    fetchReportPage: vi.fn(),
    decide: vi.fn(),
    assign: vi.fn(),
    extend: vi.fn(),
    navigate: vi.fn(),
}))

const report: AutoCareChatReport = {
    id: 'report-1', threadId: 'chat-request-owner-request-1', messageId: 'mock-message-2',
    reporterId: 'client-1', reportedUserId: 'owner-1', category: 'harassment', description: null,
    acknowledgeFullThreadReview: true, acknowledgedAt: '2026-09-08T10:00:00.000Z', policyVersion: 'v1',
    assignedModeratorId: null, accessExpiresAt: null, extensionUsed: false, status: 'pending', reviewedById: null,
    resolutionReason: null, createdAt: '2026-09-08T10:00:00.000Z', reviewedAt: null,
}

vi.mock('@/entities/automotive-service', () => ({
    useGetAdminAutoCareChatReportsQuery: (query: unknown) => { mocks.reportQueries.push(query); return { data: { items: mocks.reports, nextCursor: mocks.nextCursor, totalCount: mocks.reports.length }, isLoading: false, error: null, refetch: vi.fn() } },
    useLazyGetAdminAutoCareChatReportsQuery: () => [mocks.fetchReportPage, { isFetching: false }],
    useDecideAdminAutoCareChatReportMutation: () => [mocks.decide, { isLoading: false, error: null }],
    useAssignAdminAutoCareChatReportMutation: () => [mocks.assign, { isLoading: false, error: null }],
    useExtendAdminAutoCareChatReportAccessMutation: () => [mocks.extend, { isLoading: false, error: null }],
}))
vi.mock('@/features/auth', () => ({ useGetMeQuery: () => ({ data: { id: mocks.userId, role: mocks.role } }) }))
vi.mock('@/entities/user', () => ({ useGetAdminUsersQuery: () => ({ data: [{ id: 'moderator-1', role: 'admin', status: 'active', name: 'Alex Moderator', email: 'moderator@example.test' }] }) }))
vi.mock('react-router', async (importOriginal) => ({ ...(await importOriginal<typeof import('react-router')>()), useNavigate: () => mocks.navigate }))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({ locale: 'ru', t: (key: string) => ({
        'adminChatReports.title': 'Жалобы на чаты', 'adminChatReports.description': 'Проверяйте сообщения и вложения.',
        'adminChatReports.filter': 'Раздел очереди', 'adminChatReports.all': 'Все', 'adminChatReports.pending': 'Ожидают',
        'adminChatReports.scopeActive': 'Активные жалобы', 'adminChatReports.scopeArchive': 'Архив решений',
        'adminChatReports.search': 'Поиск по номеру жалобы или чата', 'adminChatReports.searchPlaceholder': 'Введите номер жалобы или чата',
        'adminChatReports.applySearch': 'Найти', 'adminChatReports.loadMore': 'Загрузить ещё жалобы', 'adminChatReports.assignmentFilter': 'Назначение',
        'adminChatReports.allAssignments': 'Все модераторы', 'adminChatReports.assignedToMe': 'Назначенные мне',
        'adminChatReports.unassignedReports': 'Без модератора', 'adminChatReports.categoryFilter': 'Категория',
        'adminChatReports.allCategories': 'Все категории', 'adminChatReports.resultsCount': 'Найдено жалоб',
        'adminChatReports.resolved': 'Решены', 'adminChatReports.dismissed': 'Отклонены', 'adminChatReports.empty': 'Жалоб нет.',
        'adminChatReports.category': 'Причина', 'adminChatReports.reporter': 'Заявитель', 'adminChatReports.reported': 'Участник',
        'adminChatReports.created': 'Создана', 'adminChatReports.descriptionLabel': 'Комментарий', 'adminChatReports.openChat': 'Открыть чат',
        'adminChatReports.decisionReason': 'Комментарий решения', 'adminChatReports.placeholder': 'Опишите решение…',
        'adminChatReports.required': 'Добавьте комментарий перед сохранением решения.', 'adminChatReports.block': 'Заблокировать участника',
        'adminChatReports.resolve': 'Решить', 'adminChatReports.dismiss': 'Отклонить', 'adminChatReports.saved': 'Решение сохранено',
        'adminChatReports.failedDecision': 'Не удалось сохранить решение.', 'adminChatReports.failed': 'Не удалось загрузить жалобы.',
        'adminChatReports.assignment': 'Назначенный модератор', 'adminChatReports.selectModerator': 'Выберите администратора',
        'adminChatReports.assignmentReason': 'Причина назначения', 'adminChatReports.assign': 'Сохранить назначение',
        'adminChatReports.assignmentSaved': 'Модератор назначен', 'adminChatReports.assignmentFailed': 'Ошибка назначения.',
        'adminChatReports.accessUntil': 'Доступ до', 'adminChatReports.extendAccess': 'Продлить доступ на 24 часа',
        'adminChatReports.extensionReason': 'Причина продления', 'adminChatReports.extensionSaved': 'Доступ продлён',
        'adminChatReports.extensionFailed': 'Ошибка продления.', 'adminChatReports.emergencyRead': 'Экстренный доступ',
        'adminChatReports.emergencyReason': 'Причина экстренного доступа', 'adminChatReports.emergencyOpen': 'Открыть чат',
        'adminChatReports.assignedOnly': 'Доступ только назначенному модератору.', 'adminChatReports.unanchored': 'Жалобу без привязанного сообщения нельзя назначить.',
        'adminChatReports.categories.harassment': 'Оскорбления', 'adminChatReports.categories.threat': 'Угроза',
        'adminChatReports.categories.fraud': 'Мошенничество', 'adminChatReports.categories.other': 'Другое',
        'adminChatReports.statuses.pending': 'Ожидает', 'adminChatReports.statuses.resolved': 'Решена', 'adminChatReports.statuses.dismissed': 'Отклонена',
        'common.loading': 'Загрузка', 'common.retry': 'Повторить', 'common.notProvided': 'Не указано',
    }[key] ?? key) }),
}))

describe('AdminChatReportsPanel', () => {
    beforeEach(() => {
        mocks.role = 'super_admin'
        mocks.userId = 'super-1'
        mocks.reports = [report]
        mocks.nextCursor = null
        mocks.reportQueries = []
        mocks.fetchReportPage.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({ items: [], nextCursor: null }) }))
        mocks.navigate.mockReset()
        mocks.decide.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue(report) }))
        mocks.assign.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue(report) }))
        mocks.extend.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue(report) }))
    })

    it('renders report metadata and requires a decision note', async () => {
        const user = userEvent.setup()
        render(<MemoryRouter><AdminChatReportsPanel /></MemoryRouter>)
        expect(screen.getByRole('heading', { name: 'Жалобы на чаты' })).toBeVisible()
        expect(screen.getAllByText('Оскорбления').some((element) => element.tagName === 'P')).toBe(true)
        expect(screen.getByText('••••nt-1')).toBeVisible()
        expect(screen.getByText('••••er-1')).toBeVisible()
        expect(screen.queryByText('client-1')).not.toBeInTheDocument()
        expect(screen.queryByText('owner-1')).not.toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Решить' }))
        expect(screen.getByRole('alert')).toHaveTextContent('Добавьте комментарий перед сохранением решения.')
        expect(mocks.decide).not.toHaveBeenCalled()
    })

    it('lets SuperAdmin assign a moderator with a reason', async () => {
        const user = userEvent.setup()
        render(<MemoryRouter><AdminChatReportsPanel /></MemoryRouter>)
        await user.selectOptions(screen.getByLabelText('Назначенный модератор'), 'moderator-1')
        await user.type(screen.getByLabelText('Причина назначения'), 'Нужна независимая проверка')
        await user.click(screen.getByRole('button', { name: 'Сохранить назначение' }))
        expect(mocks.assign).toHaveBeenCalledWith({ id: 'report-1', moderatorId: 'moderator-1', reason: 'Нужна независимая проверка' })
    })

    it('does not grant an ordinary admin access before assignment', () => {
        mocks.role = 'admin'
        mocks.userId = 'other-admin'
        render(<MemoryRouter><AdminChatReportsPanel /></MemoryRouter>)
        expect(screen.queryByRole('link', { name: 'Открыть чат' })).not.toBeInTheDocument()
        expect(screen.getByText('Доступ только назначенному модератору.')).toBeVisible()
    })

    it('shows an active assigned moderator a scoped read-only chat link', async () => {
        mocks.role = 'admin'
        mocks.userId = 'moderator-1'
        mocks.reports = [{ ...report, assignedModeratorId: 'moderator-1', accessExpiresAt: new Date(Date.now() + 60_000).toISOString() }]
        render(<MemoryRouter><AdminChatReportsPanel /></MemoryRouter>)
        expect(await screen.findByRole('link', { name: 'Открыть чат' })).toHaveAttribute('href', expect.stringContaining('chat-request-owner-request-1'))
    })

    it('keeps an unanchored legacy report unassignable', () => {
        mocks.reports = [{ ...report, id: 'legacy', messageId: '' }]
        render(<MemoryRouter><AdminChatReportsPanel /></MemoryRouter>)
        expect(screen.getByText('Жалобу без привязанного сообщения нельзя назначить.')).toBeVisible()
        expect(screen.queryByLabelText('Назначенный модератор')).not.toBeInTheDocument()
    })

    it('applies search and queue filters as one server query', async () => {
        const user = userEvent.setup()
        render(<MemoryRouter><AdminChatReportsPanel /></MemoryRouter>)
        await user.selectOptions(screen.getByLabelText('Раздел очереди'), 'archive')
        await user.selectOptions(screen.getByLabelText('Назначение'), 'unassigned')
        await user.selectOptions(screen.getByLabelText('Категория'), 'unsafe')
        await user.type(screen.getByPlaceholderText('Введите номер жалобы или чата'), 'case-42')
        await user.click(screen.getByRole('button', { name: 'Найти' }))
        expect(mocks.reportQueries.at(-1)).toMatchObject({ scope: 'archive', search: 'case-42', assignedModeratorId: 'unassigned', category: 'unsafe', limit: 50 })
    })

    it('uses the current filter set when loading the next cursor page', async () => {
        const user = userEvent.setup()
        mocks.nextCursor = 'cursor-2'
        render(<MemoryRouter><AdminChatReportsPanel /></MemoryRouter>)
        await user.click(screen.getByRole('button', { name: 'Загрузить ещё жалобы' }))
        expect(mocks.fetchReportPage).toHaveBeenCalledWith({ scope: 'active', limit: 50, cursor: 'cursor-2' }, true)
    })
})
