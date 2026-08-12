import { Outlet } from 'react-router'

import { BottomNav } from '@/widgets/bottom-nav'
import { WorkspaceFooter, WorkspaceHeader, WorkspaceMobileHeader, WorkspaceSidebar } from '@/widgets/workspace-shell'

export function AdminLayout() {
    return (
        <div className="min-h-screen bg-background">
            <WorkspaceHeader role="admin" />
            <div className="mobile-admin-bottom-safe flex min-h-[calc(100vh-72px)] md:pb-0">
                <WorkspaceSidebar role="admin" />
                <div className="min-w-0 flex-1">
                    <WorkspaceMobileHeader role="admin" />

                    <Outlet />
                    <WorkspaceFooter />
                </div>
            </div>
            <BottomNav />
        </div>
    )
}
