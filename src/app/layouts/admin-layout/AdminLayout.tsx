import { Outlet } from 'react-router'

import { BottomNav } from '@/widgets/bottom-nav'
import { WorkspaceFooter, WorkspaceHeader, WorkspaceMobileHeader, WorkspaceSidebar } from '@/widgets/workspace-shell'

export function AdminLayout() {
    return (
        <div className="autocare-app-surface min-h-screen">
            <WorkspaceHeader role="admin" />
            <div className="mobile-admin-bottom-safe flex min-h-[calc(100vh-72px)] md:pb-0">
                <WorkspaceSidebar role="admin" />
                <div className="flex min-w-0 flex-1 flex-col">
                    <WorkspaceMobileHeader role="admin" />

                    <div className="autocare-page-content"><Outlet /></div>
                    <WorkspaceFooter />
                </div>
            </div>
            <BottomNav />
        </div>
    )
}
