import { useEffect, useRef } from 'react'
import { AppRouter } from '@/app/routes/AppRouter'
import { Toaster } from 'sonner'
import { useGetMeQuery } from '@/features/auth'
import { I18nProvider } from '@/shared/lib/i18n-provider'
import { ThemeProvider } from '@/shared/lib/theme-provider'
import { useTranslation } from '@/shared/lib/useTranslation'
import { useTheme } from '@/shared/lib/useTheme'
import { PwaLifecycle } from '@/features/pwa-lifecycle'
import { ScrollToTopButton } from '@/shared/ui/scroll-to-top'

function AppContent() {
    const { theme } = useTheme()

    return (
        <I18nProvider>
            <AccountLocaleSync />
            <AppRouter/>
            <PwaLifecycle />
            <ScrollToTopButton />
            <Toaster richColors position="top-right" theme={theme}/>
        </I18nProvider>
    )
}

function AccountLocaleSync() {
    const { data: user } = useGetMeQuery()
    const { locale, setLocale } = useTranslation()
    const appliedUserId = useRef<string | null>(null)

    useEffect(() => {
        if (!user) {
            appliedUserId.current = null
            return
        }

        if (user.locale && appliedUserId.current !== user.id) {
            appliedUserId.current = user.id
            if (user.locale !== locale) {
                setLocale(user.locale)
            }
        }
    }, [locale, setLocale, user])

    return null
}

export function App() {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    )
}
