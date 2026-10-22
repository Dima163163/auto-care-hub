type RouteCopy = { title: string; description: string }

const authCopy: Record<string, { en: RouteCopy; ru: RouteCopy }> = {
    '/login': {
        en: { title: 'Sign in | AutoCare Hub', description: 'Sign in to manage your AutoCare Hub bookings and account.' },
        ru: { title: 'Вход | AutoCare Hub', description: 'Войдите, чтобы управлять заявками и аккаунтом AutoCare Hub.' },
    },
    '/login/callback': {
        en: { title: 'Completing sign in | AutoCare Hub', description: 'Completing your secure AutoCare Hub sign in.' },
        ru: { title: 'Завершение входа | AutoCare Hub', description: 'Завершаем безопасный вход в AutoCare Hub.' },
    },
    '/register': {
        en: { title: 'Create an account | AutoCare Hub', description: 'Create an AutoCare Hub account to book automotive services.' },
        ru: { title: 'Регистрация | AutoCare Hub', description: 'Создайте аккаунт AutoCare Hub для записи в автосервис.' },
    },
    '/forgot-password': {
        en: { title: 'Reset your password | AutoCare Hub', description: 'Request a link to reset your AutoCare Hub password.' },
        ru: { title: 'Восстановление пароля | AutoCare Hub', description: 'Запросите ссылку для восстановления пароля AutoCare Hub.' },
    },
    '/password/setup': {
        en: { title: 'Set your password | AutoCare Hub', description: 'Finish setting up your AutoCare Hub account.' },
        ru: { title: 'Создание пароля | AutoCare Hub', description: 'Завершите настройку аккаунта AutoCare Hub.' },
    },
    '/password/reset': {
        en: { title: 'Choose a new password | AutoCare Hub', description: 'Choose a new password for your AutoCare Hub account.' },
        ru: { title: 'Новый пароль | AutoCare Hub', description: 'Задайте новый пароль для аккаунта AutoCare Hub.' },
    },
    '/verify-email': {
        en: { title: 'Verify your email | AutoCare Hub', description: 'Confirm the email address for your AutoCare Hub account.' },
        ru: { title: 'Подтверждение email | AutoCare Hub', description: 'Подтвердите адрес электронной почты аккаунта AutoCare Hub.' },
    },
}

export function getAuthRouteCopy(pathname: string, locale: string): RouteCopy | undefined {
    return authCopy[pathname]?.[locale === 'ru' ? 'ru' : 'en']
}

export function isAuthRoute(pathname: string) {
    return pathname in authCopy
}

const privatePrefixes = ['/admin', '/super-admin', '/owner', '/profile', '/chats', '/onboarding', '/notifications']
const noIndexPrefixes = ['/login', '/register', '/forgot-password', '/password', '/verify-email', '/favorites', '/community/clients']

export function shouldNoIndexRoute(pathname: string, hasSearchParams = false) {
    return isAuthRoute(pathname)
        || privatePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
        || noIndexPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
        || /^\/services\/[^/]+\/request$/.test(pathname)
        || (pathname === '/services' && hasSearchParams)
}
