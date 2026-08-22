import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router'

import { useGetMeQuery } from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import { SeoHead } from '@/shared/ui/seo-head'
import { AutoCareResultsRouteSkeleton, PageContentSkeleton } from '@/shared/ui/loading-skeleton'
import { useTranslation } from '@/shared/lib/useTranslation'
import { AppHeader } from '@/widgets/app-header'
import { BottomNav } from '@/widgets/bottom-nav'
import { Footer } from '@/widgets/footer'
import {
    WorkspaceMobileHeader,
    WorkspaceSidebar,
    type WorkspaceRole,
} from '@/widgets/workspace-shell'

import { DesktopPublicHeader } from './DesktopPublicHeader'

export function PublicLayout() {
    const { t } = useTranslation()
    const { pathname } = useLocation()
    const { data: user } = useGetMeQuery()
    const workspacePaths = new Set<string>([
            ROUTES.profile,
            ROUTES.profileVehicles,
            ROUTES.profileBookings,
            ROUTES.profileReviews,
            ROUTES.notifications,
        ])
    const isWorkspaceRoute = Boolean(user && workspacePaths.has(pathname))
    const workspaceRole: WorkspaceRole = user?.role === 'owner'
        ? 'owner'
        : user?.role === 'super_admin'
            ? 'super_admin'
            : user?.role === 'admin'
                ? 'admin'
                : 'client'

    return (
        <div className="autocare-app-surface mobile-bottom-safe flex min-h-screen flex-col md:pb-0">
            <SeoHead />
            <DesktopPublicHeader />
            <div className="md:hidden">
                {isWorkspaceRoute && user ? <WorkspaceMobileHeader role={workspaceRole} /> : <AppHeader />}
            </div>
            <div className={isWorkspaceRoute ? 'flex min-h-0 flex-1' : 'flex min-h-0 flex-1 flex-col'}>
                {isWorkspaceRoute && <WorkspaceSidebar role={workspaceRole} />}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <main className="min-h-0 flex-1"><div className="autocare-page-content"><Suspense fallback={pathname === ROUTES.serviceDiscovery ? <AutoCareResultsRouteSkeleton label={t('common.loadingPage')} /> : <PageContentSkeleton label={t('common.loadingPage')} />}><Outlet /></Suspense></div></main>
                    <Footer />
                </div>
            </div>
            <BottomNav />
        </div>
    )
}
