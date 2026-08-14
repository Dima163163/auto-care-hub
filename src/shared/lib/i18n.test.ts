import { describe, expect, it } from 'vitest'

import { t } from './i18n'

describe('t', () => {
    it('returns english translation by default', () => {
        expect(t('common.loadingPage')).toBe('Loading page...')
    })

    it('returns translation for selected locale', () => {
        expect(
            t('common.loadingPage', undefined, 'ru'),
        ).toBe('Загрузка страницы...')
    })

    it('interpolates params', () => {
        expect(
            t('common.loadingPage', { count: 5 }),
        ).toBe('Loading page...')
    })

    it('returns english booking summary translation', () => {
        expect(t('booking.totalBookings')).toBe('Total bookings')
    })

    it('returns russian booking summary translation', () => {
        expect(
            t('booking.totalBookings', undefined, 'ru'),
        ).toBe('Всего бронирований')
    })

    it('returns translated auth header actions', () => {
        expect(t('auth.signIn')).toBe('Sign in')
        expect(t('auth.createAccount')).toBe('Create account')
        expect(t('auth.signIn', undefined, 'ru')).toBe('Войти')
        expect(t('auth.createAccount', undefined, 'ru')).toBe('Создать аккаунт')
    })

    it('returns translated booking validation messages', () => {
        expect(t('booking.validation.serviceRequired')).toBe('Service is required.')
        expect(
            t('booking.validation.serviceRequired', undefined, 'ru'),
        ).toBe('Выберите услугу.')
    })

    it('returns translated owner booking status labels', () => {
        expect(t('booking.pendingStatusLabel')).toBe('Pending')
        expect(t('booking.pendingStatusLabel', undefined, 'ru')).toBe('Ожидает')
    })

    it('interpolates booking status screen reader text', () => {
        expect(
            t('booking.currentStatusScreenReader', { status: 'Pending' }),
        ).toBe('Current booking status is Pending')
        expect(
            t('booking.currentStatusScreenReader', { status: 'Ожидает' }, 'ru'),
        ).toBe('Текущий статус бронирования: Ожидает')
    })

    it('returns translated owner cabinet form text', () => {
        expect(t('cabinet.form.createTitle')).toBe('Create cabinet')
        expect(
            t('cabinet.form.createTitle', undefined, 'ru'),
        ).toBe('Создать кабинет')
        expect(
            t('cabinet.validation.titleMin', { count: 3 }),
        ).toBe('Title must contain at least 3 characters.')
        expect(
            t('cabinet.validation.titleMin', { count: 3 }, 'ru'),
        ).toBe('Название должно содержать минимум 3 символа.')
    })

    it('returns translated owner service form text', () => {
        expect(t('service.form.createTitle')).toBe('Create service')
        expect(
            t('service.form.createTitle', undefined, 'ru'),
        ).toBe('Создать услугу')
        expect(
            t('service.validation.durationMin', { count: 15 }),
        ).toBe('Duration must be at least 15 minutes.')
        expect(
            t('service.form.durationMinutes', { count: 60 }, 'ru'),
        ).toBe('60 мин')
    })

    it('returns translated owner cabinet list text', () => {
        expect(t('cabinet.ownerList.title')).toBe('My cabinets')
        expect(
            t('cabinet.ownerList.title', undefined, 'ru'),
        ).toBe('Мои кабинеты')
        expect(
            t('cabinet.ownerList.pricePerHour', { price: '1,500 ₽' }),
        ).toBe('1,500 ₽ per hour')
        expect(t('cabinet.draftStatusLabel', undefined, 'ru')).toBe('Черновик')
    })

    it('returns translated public cabinet text', () => {
        expect(t('cabinet.publicList.title')).toBe('Available cabinets')
        expect(
            t('cabinet.publicList.title', undefined, 'ru'),
        ).toBe('Доступные кабинеты')
        expect(
            t('cabinet.publicList.imageAlt', { title: 'Studio' }),
        ).toBe('Studio interior')
        expect(
            t('cabinet.details.serviceDurationMinutes', { count: 60 }, 'ru'),
        ).toBe('60 минут')
    })

    it('returns translated profile and client booking text', () => {
        expect(t('profile.title')).toBe('My profile')
        expect(t('profile.title', undefined, 'ru')).toBe('Мой профиль')
        expect(t('user.superAdmin')).toBe('Super admin')
        expect(t('user.superAdmin', undefined, 'ru')).toBe('Суперадминистратор')
        expect(t('booking.myBookingsDescription')).toBe(
            'Track your cabinet reservations and their current status.',
        )
        expect(t('user.blockedStatusLabel', undefined, 'ru')).toBe('Заблокирован')
    })

    it('keeps Arabic catalog and profile chrome out of the English fallback', () => {
        expect(t('cabinet.publicList.title', undefined, 'ar')).toBe('المساحات المتاحة')
        expect(t('cabinet.publicList.searchPlaceholder', undefined, 'ar')).toBe('ابحث بالاسم أو المدينة...')
        expect(t('profile.title', undefined, 'ar')).toBe('ملفي الشخصي')
        expect(t('profile.preferences.title', undefined, 'ar')).toBe('الإشعارات')
    })

    it('returns translated auth screen text', () => {
        expect(t('auth.signInTitle')).toBe('Sign in to AutoCare Hub')
        expect(t('auth.signInTitle', undefined, 'ru')).toBe('Войти в AutoCare Hub')
        expect(t('auth.validation.passwordMin', { count: 6 })).toBe(
            'Password must contain at least 6 characters.',
        )
        expect(t('auth.accountBlocked', undefined, 'ru')).toBe('Аккаунт заблокирован')
    })

    it('returns translated owner dashboard text', () => {
        expect(t('ownerDashboard.title')).toBe('Dashboard')
        expect(t('ownerDashboard.title', undefined, 'ru')).toBe('Панель')
        expect(
            t('ownerDashboard.bookingStatusCounts', {
                pending: 2,
                confirmed: 3,
            }),
        ).toBe('2 pending · 3 confirmed')
        expect(
            t('ownerDashboard.serviceMeta', {
                duration: 60,
                price: '1,500 ₽',
            }, 'ru'),
        ).toBe('60 мин · 1,500 ₽')
    })

    it('returns translated admin dashboard text', () => {
        expect(t('adminDashboard.title')).toBe('Dashboard')
        expect(t('adminDashboard.title', undefined, 'ru')).toBe('Панель')
        expect(
            t('adminDashboard.userRoleCounts', {
                clients: 2,
                owners: 3,
                admins: 1,
            }),
        ).toBe('2 clients · 3 owners · 1 admins')
        expect(
            t('adminDashboard.moderationBreakdown', {
                draftCabinets: 1,
                blockedCabinets: 2,
                blockedUsers: 3,
            }, 'ru'),
        ).toBe('1 черновиков точек · 2 заблокированных точек · 3 заблокированных пользователей')
    })

    it('returns translated admin users text', () => {
        expect(t('adminUsers.title')).toBe('Users')
        expect(t('adminUsers.title', undefined, 'ru')).toBe('Пользователи')
        expect(t('adminUsers.statusUpdatedSuccessfully')).toBe(
            'User status updated successfully.',
        )
        expect(t('adminUsers.confirmBlockTitle', undefined, 'ru')).toBe(
            'Заблокировать этого пользователя?',
        )
        expect(t('adminUsers.adminStatusRestricted')).toBe(
            'Only super admin can manage admin accounts.',
        )
    })

    it('returns translated admin cabinets text', () => {
        expect(t('adminCabinets.title')).toBe('Service locations')
        expect(t('adminCabinets.title', undefined, 'ru')).toBe('Точки автосервисов')
        expect(t('adminCabinets.statusUpdatedSuccessfully')).toBe(
            'Service location status updated successfully.',
        )
        expect(t('adminCabinets.confirmBlockTitle', undefined, 'ru')).toBe(
            'Заблокировать эту точку автосервиса?',
        )
    })

    it('returns translated landing and not found text', () => {
        expect(t('landing.liveMock')).toBe('Live mock')
        expect(t('landing.nextBookingMeta', undefined, 'ru')).toBe(
            'Замена масла · 14:30 · Подтверждено',
        )
        expect(t('notFound.title')).toBe('Page not found')
        expect(t('notFound.goHome', undefined, 'ru')).toBe('На главную')
    })

    it('returns translated review moderation text', () => {
        expect(t('review.publicTitle')).toBe('Reviews')
        expect(t('review.publicTitle', undefined, 'ru')).toBe('Отзывы')
        expect(t('review.submittedForModeration')).toBe(
            'Review sent for moderation.',
        )
        expect(t('review.awaitingModeration', undefined, 'ru')).toBe(
            'Ваш отзыв ожидает проверки администратором.',
        )
        expect(t('review.updatedForModeration')).toBe(
            'Review updated and sent for moderation.',
        )
        expect(t('review.myReviewsTitle', undefined, 'ru')).toBe('Мои отзывы')
        expect(t('review.editAction', undefined, 'ru')).toBe(
            'Редактировать отзыв',
        )
        expect(t('adminReviews.pendingAction', undefined, 'ru')).toBe(
            'Вернуть на проверку',
        )
        expect(t('adminReviews.approvedAction', undefined, 'ru')).toBe(
            'Опубликовать',
        )
        expect(t('navigation.adminReviews')).toBe('Reviews')
    })
})
