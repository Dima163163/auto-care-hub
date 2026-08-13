import { Link, Outlet } from 'react-router'

import { useGetMeQuery } from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { BottomNav } from '@/widgets/bottom-nav'
import { WorkspaceFooter, WorkspaceHeader, WorkspaceMobileHeader, WorkspaceSidebar } from '@/widgets/workspace-shell'

export function OwnerLayout() {
    const { t } = useTranslation()
    const { data: user } = useGetMeQuery()

    return (
        <div className="mobile-bottom-safe min-h-screen bg-background flex flex-col md:pb-0">
            <WorkspaceHeader role="owner" showCreateProvider />
            <div className="flex min-h-[calc(100vh-72px)] flex-1">
                <WorkspaceSidebar role="owner" />
                <div className="flex min-w-0 flex-1 flex-col">
                    <WorkspaceMobileHeader role="owner" />

                    {user && !user.emailVerifiedAt && (
                        <div className="bg-status-warning-surface px-4 py-2 text-center text-sm font-medium text-status-warning-foreground">
                            {t('auth.unverifiedEmailDescription')}{' '}
                            <Link to={ROUTES.profile} className="underline hover:text-foreground">
                                {t('navigation.profile')}
                            </Link>
                        </div>
                    )}

                    <Outlet />
                    <WorkspaceFooter />
                </div>
            </div>

            <BottomNav />
        </div>
    )
}
