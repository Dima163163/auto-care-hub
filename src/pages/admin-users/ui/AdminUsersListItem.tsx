import {
    canManageUserStatus,
    UserRoleBadge,
    UserStatusBadge,
    type User,
    type UserRole,
    type UserStatus,
    useUpdateAdminUserRoleMutation,
} from '@/entities/user'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { toast } from 'sonner'
import { useTranslation } from '@/shared/lib/useTranslation'

type AdminUsersListItemProps = {
    isUpdating: boolean
    onStatusChange: (id: string, status: UserStatus) => void
    user: User
    viewerRole?: UserRole | undefined
    viewerId?: string
}

export function AdminUsersListItem({
    isUpdating,
    onStatusChange,
    user,
    viewerRole,
    viewerId,
}: AdminUsersListItemProps) {
    const { t, locale } = useTranslation()
    const [updateRole, { isLoading: isRoleUpdating }] = useUpdateAdminUserRoleMutation()
    const canChangeStatus = canManageUserStatus(viewerRole, user.role)
    const isSuperViewer = viewerRole === 'super_admin'

    const handleRoleChange = async (newRole: UserRole) => {
        if (newRole === user.role) return
        if (!window.confirm(t('adminUsers.roleChangeConfirm'))) return
        try {
            await updateRole({ id: user.id, role: newRole }).unwrap()
            toast.success(t('adminUsers.roleUpdatedSuccessfully'))
        } catch (error) {
            toast.error(
                getApiErrorMessage(error, t('adminUsers.roleUpdateFailed'))
            )
        }
    }

    return <div className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(160px,1.2fr)_minmax(170px,1.3fr)_110px_110px_minmax(150px,1fr)] lg:items-start">
        <div className="min-w-0"><p className="font-medium">{user.name}</p>{user.phone && <p className="mt-1 text-sm text-muted-foreground">{user.phone}</p>}</div>
        <p className="min-w-0 break-words text-sm text-muted-foreground">{user.email}</p>
        <div><UserRoleBadge role={user.role} /></div>
        <div><UserStatusBadge status={user.status} /></div>
        <div className="space-y-2">
            <button type="button" disabled={isUpdating || !canChangeStatus || user.id === viewerId} title={!canChangeStatus ? t('adminUsers.adminStatusRestricted') : undefined} onClick={() => void onStatusChange(user.id, user.status === 'active' ? 'blocked' : 'active')} className={`min-h-11 rounded-[var(--radius-control)] border px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${user.status === 'active' ? 'border-destructive/30 text-destructive hover:bg-destructive/5' : 'border-border text-primary hover:border-primary'}`}>{t(user.status === 'active' ? 'autocare.blockUserAction' : 'autocare.unblockUserAction')}</button>
            <details className="text-sm"><summary className="cursor-pointer text-primary">{t('autocare.detailsAction')}</summary><div className="mt-3 space-y-3 text-muted-foreground"><p>{t('profile.authProvider')}: {user.provider}</p><p>{t('profile.createdAt')}: {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(user.createdAt))}</p>
                {isSuperViewer && <label className="grid gap-1.5"><span>{t('profile.role')}</span><select aria-label={`${t('profile.role')}: ${user.name}`} value={user.role} disabled={isUpdating || isRoleUpdating} onChange={(event) => { const role = event.target.value; if (role === 'client' || role === 'owner' || role === 'admin' || role === 'super_admin') void handleRoleChange(role) }} className="min-h-11 w-full rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm"><option value="client">{t('adminUsers.roleClient')}</option><option value="owner">{t('adminUsers.roleOwner')}</option><option value="admin">{t('adminUsers.roleAdmin')}</option><option value="super_admin">{t('adminUsers.roleSuperAdmin')}</option></select></label>}
            </div></details>
        </div>
    </div>
}
