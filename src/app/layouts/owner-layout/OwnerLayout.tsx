import { Suspense } from 'react'
import { Link, Outlet } from 'react-router'

import { useGetMeQuery } from '@/features/auth'
import { useGetOwnerAutoCareWorkspaceAccessQuery } from '@/entities/automotive-service'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { BottomNav } from '@/widgets/bottom-nav'
import { WorkspaceHeader, WorkspaceMobileHeader, WorkspaceSidebar } from '@/widgets/workspace-shell'
import { PageContentSkeleton } from '@/shared/ui/loading-skeleton'

export function OwnerLayout() {
    const { t } = useTranslation()
    const { data: user } = useGetMeQuery()
    const workspaceAccess = useGetOwnerAutoCareWorkspaceAccessQuery(undefined, { skip: !user || user.role === 'owner' })
    const roles = workspaceAccess.data?.scopes.flatMap((scope) => scope.roles) ?? []
    const workspaceRole = user?.role === 'owner'
        ? 'owner'
        : roles.includes('manager')
            ? 'manager'
            : 'staff'

    return (
        <div className="autocare-app-surface mobile-bottom-safe flex h-dvh min-h-0 flex-col overflow-hidden md:pb-0">
            <WorkspaceHeader role={workspaceRole} showCreateProvider={workspaceRole === 'owner'} />
            <div className="flex min-h-0 flex-1 overflow-hidden">
                <WorkspaceSidebar role={workspaceRole} />
                <div data-workspace-scroll-container className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain">
                    <WorkspaceMobileHeader role={workspaceRole} />

                    {user && !user.emailVerifiedAt && (
                        <div className="bg-status-warning-surface px-4 py-2 text-center text-sm font-medium text-status-warning-foreground">
                            {t('auth.unverifiedEmailDescription')}{' '}
                            <Link to={ROUTES.profile} className="underline hover:text-foreground">
                                {t('navigation.profile')}
                            </Link>
                        </div>
                    )}

                    <div className="autocare-page-content"><Suspense fallback={<PageContentSkeleton label={t('common.loadingPage')} tone="workspace" />}><Outlet /></Suspense></div>
                </div>
            </div>
            <BottomNav />
        </div>
    )
}
