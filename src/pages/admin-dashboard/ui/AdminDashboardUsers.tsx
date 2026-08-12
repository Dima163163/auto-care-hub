import { UserRoleBadge, UserStatusBadge, type User } from '@/entities/user'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { StateCard } from '@/shared/ui/state-card'

import { AdminDashboardSectionHeader } from './AdminDashboardSectionHeader'

type AdminDashboardUsersProps = {
    users: User[]
}

export function AdminDashboardUsers({
    users,
}: AdminDashboardUsersProps) {
    const { t } = useTranslation()

    return (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
            <AdminDashboardSectionHeader
                description={t('adminDashboard.recentUsersDescription')}
                linkLabel={t('adminDashboard.viewAll')}
                title={t('adminDashboard.recentUsers')}
                to={ROUTES.adminUsers}
            />

            {users.length === 0 && (
                <StateCard description={t('adminDashboard.noUsers')} className="mt-4" />
            )}

            {users.length > 0 && (
                <div className="space-y-3">
                    {users.map((user) => (
                        <div
                            key={user.id}
                            className="rounded-xl border bg-background p-4"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-medium">
                                        {user.name}
                                    </p>

                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {user.email}
                                    </p>
                                </div>

                                <div className="flex flex-wrap justify-end gap-2">
                                    <UserRoleBadge role={user.role} />
                                    <UserStatusBadge status={user.status} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
