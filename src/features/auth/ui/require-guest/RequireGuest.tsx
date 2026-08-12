import type { ReactNode } from 'react'
import { Navigate } from 'react-router'

import { useTranslation } from '@/shared/lib/useTranslation'

import { useGetMeQuery } from '../../api/authApi'
import { getDefaultRouteByRole } from '../../lib/getDefaultRouteByRole'

type RequireGuestProps = {
    children: ReactNode
}

export function RequireGuest({ children }: RequireGuestProps) {
    const { t } = useTranslation()
    const {
        data: user,
        isLoading,
        isError
    } = useGetMeQuery()

    if (isLoading) {
        return (
            <main className="min-h-screen bg-background px-4 py-10">
                <section className="mx-auto max-w-3xl rounded-xl border bg-card p-8 shadow-sm">
                    <p className="text-muted-foreground">
                        {t('auth.checkingSession')}
                    </p>
                </section>
            </main>
        )
    }

    if (isError || !user) {
        return children
    }

    return (
        <Navigate
            to={getDefaultRouteByRole(user.role)}
            replace
        />
    )
}
