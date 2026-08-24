import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'

import { buttonVariants } from '@/components/ui/button-variants'
import { Skeleton } from '@/components/ui/skeleton'
import type { UserRole } from '@/entities/user'
import { useGetOwnerAutoCareWorkspaceAccessQuery } from '@/entities/automotive-service'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

import { useGetMeQuery } from '../../api/authApi'
import { getDefaultRouteByRole } from '../../lib/getDefaultRouteByRole'

type RequireAuthProps = {
    children: ReactNode
    allowedRoles?: UserRole[]
    allowOwnerWorkspace?: boolean
}

export function RequireAuth({ children, allowedRoles, allowOwnerWorkspace = false }: RequireAuthProps) {
    const { t } = useTranslation()
    const location = useLocation()

    const {
        data: user,
        isLoading,
        isError
    } = useGetMeQuery()
    const workspaceAccess = useGetOwnerAutoCareWorkspaceAccessQuery(undefined, {
        skip: !allowOwnerWorkspace || !user || user.role === 'owner',
    })


    if (isLoading) {
        return (
            <main className="min-h-screen bg-background px-4 py-10">
                <section aria-busy="true" aria-label={t('auth.checkingSession')} className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <Skeleton className="h-8 w-52" />
                        <Skeleton className="mt-4 h-4 w-full max-w-lg" />
                        <Skeleton className="mt-2 h-4 w-4/5" />
                        <div className="mt-7 grid gap-3 sm:grid-cols-2">
                            <Skeleton className="h-36 rounded-lg" />
                            <Skeleton className="h-36 rounded-lg" />
                        </div>
                    </div>
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="mt-5 h-11 w-full rounded-lg" />
                        <Skeleton className="mt-3 h-11 w-full rounded-lg" />
                        <Skeleton className="mt-3 h-11 w-full rounded-lg" />
                    </div>
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

    if (allowOwnerWorkspace && user.role !== 'owner' && workspaceAccess.isLoading) {
        return <main className="min-h-screen bg-background" aria-busy="true" />
    }

    if (allowedRoles && !allowedRoles.includes(user.role) && !workspaceAccess.data?.allowed) {
        return (
            <Navigate
                to={getDefaultRouteByRole(user.role)}
                replace
            />
        )
    }

    return children
}
