import { Suspense } from 'react'
import { Outlet } from 'react-router'

import { useGetMeQuery } from '@/features/auth'
import { BottomNav } from '@/widgets/bottom-nav'
import { WorkspaceFooter, WorkspaceHeader, WorkspaceMobileHeader, WorkspaceSidebar } from '@/widgets/workspace-shell'
import { PageContentSkeleton } from '@/shared/ui/loading-skeleton'
import { useTranslation } from '@/shared/lib/useTranslation'

export function AdminLayout() {
    const { t } = useTranslation()
    const { data: user } = useGetMeQuery()
    const role = user?.role === 'super_admin' ? 'super_admin' : 'admin'

    return (
        <div className="autocare-app-surface flex h-dvh min-h-0 flex-col overflow-hidden">
            <WorkspaceHeader role={role} />
            <div className="mobile-admin-bottom-safe flex min-h-0 flex-1 overflow-hidden md:pb-0">
                <WorkspaceSidebar role={role} />
                <div data-workspace-scroll-container className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain">
                    <WorkspaceMobileHeader role={role} />

                    <div className="autocare-page-content"><Suspense fallback={<PageContentSkeleton label={t('common.loadingPage')} tone="workspace" />}><Outlet /></Suspense></div>
                </div>
            </div>
            <WorkspaceFooter />
            <BottomNav />
        </div>
    )
}
