import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'

import { buttonVariants } from '@/components/ui/button-variants'
import type { UserRole } from '@/entities/user'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

import { useGetMeQuery } from '../../api/authApi'
import { getDefaultRouteByRole } from '../../lib/getDefaultRouteByRole'

type RequireAuthProps = {
    children: ReactNode
    allowedRoles?: UserRole[]
}

export function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
    const { t } = useTranslation()
    const location = useLocation()

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
        return (
            <Navigate
                to={ROUTES.login}
                replace
                state={{
                    from: location,
                }}
            />
        )
    }

    if (user.status === 'blocked') {
        return (
            <main className="min-h-screen bg-background px-4 py-10">
                <section className="mx-auto max-w-3xl rounded-xl border bg-card p-8 shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground">
                        {t('auth.accessRestricted')}
                    </p>

                    <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                        {t('auth.accountBlocked')}
                    </h1>

                    <p className="mt-3 text-muted-foreground">
                        {t('auth.accountBlockedDescription')}
                    </p>

                    <div className="mt-6">
                        <Link
                            to={ROUTES.home}
                            className={buttonVariants({ variant: 'outline' })}
                        >
                            {t('auth.goToHome')}
                        </Link>
                    </div>
                </section>
            </main>
        )
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return (
            <Navigate
                to={getDefaultRouteByRole(user.role)}
                replace
            />
        )
    }

    return children
}
