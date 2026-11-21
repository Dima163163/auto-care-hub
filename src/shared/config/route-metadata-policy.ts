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

const directLinkAuthCopy: Record<'es' | 'ro', Record<string, RouteCopy>> = {
    es: {
        '/login': { title: 'Iniciar sesión | AutoCare Hub', description: 'Accede para gestionar tus citas y tu cuenta.' },
        '/login/callback': { title: 'Completando el acceso | AutoCare Hub', description: 'Estamos completando el inicio de sesión.' },
        '/register': { title: 'Crear una cuenta | AutoCare Hub', description: 'Crea una cuenta para pedir cita en un taller.' },
        '/forgot-password': { title: 'Restablecer contraseña | AutoCare Hub', description: 'Solicita un enlace para restablecer tu contraseña.' },
        '/password/setup': { title: 'Configurar contraseña | AutoCare Hub', description: 'Completa la configuración de tu cuenta.' },
        '/password/reset': { title: 'Elegir una contraseña nueva | AutoCare Hub', description: 'Elige una contraseña nueva para tu cuenta.' },
        '/verify-email': { title: 'Verificar correo electrónico | AutoCare Hub', description: 'Confirma el correo de tu cuenta.' },
    },
    ro: {
        '/login': { title: 'Autentificare | AutoCare Hub', description: 'Autentifică-te pentru a gestiona programările și contul.' },
        '/login/callback': { title: 'Finalizarea autentificării | AutoCare Hub', description: 'Finalizăm autentificarea în cont.' },
        '/register': { title: 'Creează un cont | AutoCare Hub', description: 'Creează un cont pentru a solicita o programare auto.' },
        '/forgot-password': { title: 'Resetarea parolei | AutoCare Hub', description: 'Solicită un link pentru resetarea parolei.' },
        '/password/setup': { title: 'Setarea parolei | AutoCare Hub', description: 'Finalizează configurarea contului.' },
        '/password/reset': { title: 'Alege o parolă nouă | AutoCare Hub', description: 'Alege o parolă nouă pentru contul tău.' },
        '/verify-email': { title: 'Verificarea adresei de e-mail | AutoCare Hub', description: 'Confirmă adresa de e-mail asociată contului.' },
    },
}

export function getAuthRouteCopy(pathname: string, locale: string): RouteCopy | undefined {
    if (locale === 'es' || locale === 'ro') return directLinkAuthCopy[locale][pathname]
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
