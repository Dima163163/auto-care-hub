import type { User, UserRole, UserStatus } from '@/entities/user'
import { useTranslation } from '@/shared/lib/useTranslation'

import { AdminUsersListItem } from './AdminUsersListItem'

type AdminUsersListProps = {
    isUpdating: boolean
    onStatusChange: (id: string, status: UserStatus) => void
    users: User[]
    viewerRole?: UserRole | undefined
}

export function AdminUsersList({
    isUpdating,
    onStatusChange,
    users,
    viewerRole,
}: AdminUsersListProps) {
    const { t } = useTranslation()

    return (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="hidden grid-cols-[minmax(180px,1.2fr)_minmax(180px,1.25fr)_minmax(150px,0.95fr)_minmax(100px,0.7fr)_minmax(110px,0.8fr)_minmax(150px,0.95fr)_minmax(140px,0.9fr)] gap-4 border-b bg-muted/30 px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground lg:grid">
                <span>{t('adminUsers.userColumn')}</span>
                <span>{t('auth.email')}</span>
                <span>{t('profile.role')}</span>
                <span>{t('common.status')}</span>
                <span>{t('profile.authProvider')}</span>
                <span>{t('profile.createdAt')}</span>
                <span>{t('common.actions')}</span>
            </div>

            <div className="divide-y">
                {users.map((user) => (
                    <AdminUsersListItem
                        key={user.id}
                        isUpdating={isUpdating}
                        viewerRole={viewerRole}
                        user={user}
                        onStatusChange={onStatusChange}
                    />
                ))}
            </div>
        </div>
    )
}
