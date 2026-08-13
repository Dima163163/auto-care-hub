import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'
import { QueryRefreshError } from '@/shared/ui/query-refresh-error'
import {
    useGetAdminUsersQuery,
    useUpdateAdminUserStatusMutation,
    type UserStatus,
} from '@/entities/user'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { toast } from 'sonner'
import { AdminUsersListItem } from '../../admin-users/ui/AdminUsersListItem'
import { AdminUsersStateCard } from '../../admin-users/ui/AdminUsersStateCard'
import { useGetMeQuery } from '@/features/auth'

export function AdminOwnersPage() {
    const { t } = useTranslation()
    const { data: viewer } = useGetMeQuery()
    const {
        data: users = [],
        isFetching,
        isLoading,
        isError,
        error,
        refetch,
    } = useGetAdminUsersQuery()

    const [updateStatus, { isLoading: isUpdating }] = useUpdateAdminUserStatusMutation()

    const owners = users.filter((user) => user.role === 'owner')
    const hasStaleOwners = owners.length > 0

    const handleStatusChange = async (id: string, status: UserStatus) => {
        try {
            await updateStatus({ id, status }).unwrap()
            toast.success(t('adminUsers.statusUpdatedSuccessfully'))
        } catch (error) {
            toast.error(
                getApiErrorMessage(error, t('adminUsers.statusUpdateFailed'))
            )
        }
    }

    return (
        <main
            className="relative z-0 min-h-full bg-background px-4 py-8 lg:px-8"
            aria-busy={isLoading || isFetching}
        >
            <PageHeader
                eyebrow={t('workspace.admin')}
                title={t('navigation.adminOwners')}
                description={t('adminOwners.description')}
            />

            <QueryRefreshStatus
                isRefreshing={isFetching && !isLoading}
                label={t('common.refreshing')}
            />

            <div className="mt-8 rounded-xl border bg-card shadow-sm">
                <div className="hidden border-b bg-muted/30 px-5 py-3 lg:grid lg:grid-cols-[1.2fr_1.1fr_0.9fr_0.7fr_0.8fr_0.9fr_0.9fr]">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('common.name')}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('auth.email')}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('profile.role')}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('common.status')}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('profile.authProvider')}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('profile.createdAt')}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                        {t('common.actions')}
                    </span>
                </div>

                {isLoading && (
                    <div className="p-8">
                        <AdminUsersStateCard state="loading" />
                    </div>
                )}

                {isError && !hasStaleOwners && (
                    <div className="p-8">
                        <AdminUsersStateCard
                            onRetry={refetch}
                            state="error"
                        />
                    </div>
                )}

                {isError && hasStaleOwners && (
                    <QueryRefreshError
                        message={getApiErrorMessage(error, t('common.tryAgainLater'))}
                        onRetry={refetch}
                        retryLabel={t('common.retry')}
                    />
                )}

                {!isLoading && !isError && owners.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                        <p className="font-medium text-foreground">{t('adminOwners.emptyTitle')}</p>
                        <p className="mt-2 text-sm">{t('adminOwners.emptyDescription')}</p>
                    </div>
                )}

                {!isLoading && (!isError || hasStaleOwners) && owners.length > 0 && (
                    <div className="divide-y">
                        {owners.map((user) => (
                            <AdminUsersListItem
                                key={user.id}
                                user={user}
                                isUpdating={isUpdating}
                                onStatusChange={handleStatusChange}
                                viewerRole={viewer?.role}
                            />
                        ))}
                    </div>
                )}
            </div>
        </main>
    )
}
