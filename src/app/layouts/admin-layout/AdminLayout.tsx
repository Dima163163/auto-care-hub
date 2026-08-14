import { Outlet } from 'react-router'

import { useGetMeQuery } from '@/features/auth'
import { BottomNav } from '@/widgets/bottom-nav'
import { WorkspaceFooter, WorkspaceHeader, WorkspaceMobileHeader, WorkspaceSidebar } from '@/widgets/workspace-shell'

export function AdminLayout() {
    const { data: user } = useGetMeQuery()
    const role = user?.role === 'super_admin' ? 'super_admin' : 'admin'

    return (
        <div className="autocare-app-surface min-h-screen">
            <WorkspaceHeader role={role} />
            <div className="mobile-admin-bottom-safe flex min-h-[calc(100vh-72px)] md:pb-0">
                <WorkspaceSidebar role={role} />
                <div className="flex min-w-0 flex-1 flex-col">
                    <WorkspaceMobileHeader role={role} />

                    <div className="autocare-page-content"><Outlet /></div>
                    <WorkspaceFooter />
                </div>
            </div>
            <BottomNav />
        </div>
    )
}
