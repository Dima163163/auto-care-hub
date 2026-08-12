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
}

export function AdminUsersListItem({
    isUpdating,
    onStatusChange,
    user,
    viewerRole,
}: AdminUsersListItemProps) {
    const { t } = useTranslation()
    const [updateRole, { isLoading: isRoleUpdating }] = useUpdateAdminUserRoleMutation()
    const canChangeStatus = canManageUserStatus(viewerRole, user.role)
    const isSuperViewer = viewerRole === 'super_admin'

    const handleRoleChange = async (newRole: UserRole) => {
        try {
            await updateRole({ id: user.id, role: newRole }).unwrap()
            toast.success(t('adminUsers.roleUpdatedSuccessfully'))
        } catch (error) {
            toast.error(
                getApiErrorMessage(error, t('adminUsers.roleUpdateFailed'))
            )
        }
    }

    return (
        <div className="flex flex-col gap-4 px-5 py-4 lg:grid lg:grid-cols-[minmax(180px,1.2fr)_minmax(180px,1.25fr)_minmax(150px,0.95fr)_minmax(100px,0.7fr)_minmax(110px,0.8fr)_minmax(150px,0.95fr)_minmax(140px,0.9fr)]">
            <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full border bg-muted text-sm font-medium">
                    {user.name.slice(0, 1)}
                </div>

                <div className="min-w-0">
                    <p className="font-medium">
                        {user.name}
                    </p>

                    {user.phone && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            {user.phone}
                        </p>
                    )}
                </div>
            </div>

            <div className="min-w-0 break-words text-sm text-muted-foreground">
                <MobileLabel label={t('auth.email')} />
                {user.email}
            </div>

            <div className="flex items-center justify-between gap-3 lg:block">
                <MobileLabel label={t('profile.role')} inline />
                {isSuperViewer ? (
                    <select
                        value={user.role}
                        disabled={isUpdating || isRoleUpdating}
                        onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                        className="min-h-11 w-full min-w-0 rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <option value="client">{t('adminUsers.roleClient')}</option>
                        <option value="owner">{t('adminUsers.roleOwner')}</option>
                        <option value="admin">{t('adminUsers.roleAdmin')}</option>
                        <option value="super_admin">{t('adminUsers.roleSuperAdmin')}</option>
                    </select>
                ) : (
                    <UserRoleBadge role={user.role} />
                )}
            </div>

            <div className="flex items-center justify-between gap-3 lg:block">
                <MobileLabel label={t('common.status')} inline />
                <UserStatusBadge status={user.status} />
            </div>

            <div className="min-w-0 text-sm capitalize text-muted-foreground">
                <MobileLabel label={t('profile.authProvider')} />
                {user.provider}
            </div>

            <div className="min-w-0 text-sm text-muted-foreground">
                <MobileLabel label={t('profile.createdAt')} />
                {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(user.createdAt))}
            </div>

            <div>
                <MobileLabel label={t('common.actions')} />
                <select
                    value={user.status}
                    disabled={isUpdating || !canChangeStatus}
                    title={
                        canChangeStatus
                            ? undefined
                            : t('adminUsers.adminStatusRestricted')
                    }
                    onChange={(event) =>
                        void onStatusChange(
                            user.id,
                            event.target.value as UserStatus,
                        )
                    }
                    className="min-h-11 w-full min-w-0 rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <option value="active">{t('user.activeStatusLabel')}</option>
                    <option value="blocked">{t('user.blockedStatusLabel')}</option>
                </select>

            </div>
        </div>
    )
}

type MobileLabelProps = {
    inline?: boolean
    label: string
}

function MobileLabel({
    inline = false,
    label,
}: MobileLabelProps) {
    return (
        <span
            className={
                inline
                    ? 'text-xs font-medium uppercase text-muted-foreground lg:hidden'
                    : 'mb-1 block text-xs font-medium uppercase text-muted-foreground lg:hidden'
            }
        >
            {label}
        </span>
    )
}
