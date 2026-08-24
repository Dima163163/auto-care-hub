import type { ReactNode } from 'react'
import { Navigate } from 'react-router'

import { useTranslation } from '@/shared/lib/useTranslation'
import { Skeleton } from '@/components/ui/skeleton'

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
                <section aria-busy="true" aria-label={t('auth.checkingSession')} className="mx-auto max-w-md rounded-xl border bg-card p-8 shadow-sm">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="mt-5 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-4/5" />
                    <Skeleton className="mt-8 h-11 w-full rounded-lg" />
                    <Skeleton className="mt-3 h-11 w-full rounded-lg" />
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
