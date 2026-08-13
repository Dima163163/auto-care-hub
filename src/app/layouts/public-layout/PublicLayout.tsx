import { Outlet, useLocation } from 'react-router'

import { useGetMeQuery } from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import { SeoHead } from '@/shared/ui/seo-head'
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
    const { pathname } = useLocation()
    const { data: user } = useGetMeQuery()
    const isWorkspaceRoute = Boolean(
        user && (pathname === ROUTES.profile || pathname === ROUTES.notifications),
    )
    const workspaceRole: WorkspaceRole = user?.role === 'owner'
        ? 'owner'
        : user?.role === 'admin' || user?.role === 'super_admin'
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
                    <main className="min-h-0 flex-1"><Outlet /></main>
                    <Footer />
                </div>
            </div>
            <BottomNav />
        </div>
    )
}
