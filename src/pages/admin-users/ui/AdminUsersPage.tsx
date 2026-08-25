import { useState } from 'react'
import { toast } from 'sonner'

import {
    canManageUserStatus,
    type UserStatus,
    useGetAdminUsersQuery,
    useUpdateAdminUserStatusMutation,
} from '@/entities/user'
import { useGetMeQuery } from '@/features/auth'
import { getApiErrorCode, getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { resolveQueryViewState } from '@/shared/api/query-view-state'
import { useOnlineStatus } from '@/features/pwa-lifecycle/lib/useOnlineStatus'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { QueryRefreshError } from '@/shared/ui/query-refresh-error'
import { Button } from '@/components/ui/button'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'

import { AdminUserBlockDialog } from './AdminUserBlockDialog'
import { AdminUsersList } from './AdminUsersList'
import { AdminUsersStateCard } from './AdminUsersStateCard'
import { AdminCreateDialog } from './AdminCreateDialog'

export function AdminUsersPage() {
    const { t } = useTranslation()
    const [userIdToBlock, setUserIdToBlock] = useState<string | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const {
        data: usersData,
        isFetching,
        isLoading,
        isError,
        error,
        refetch,
    } = useGetAdminUsersQuery()
    const { data: currentUser } = useGetMeQuery()
    const isOnline = useOnlineStatus()
    const users = usersData ?? []
    const queryState = resolveQueryViewState({
        isLoading,
        isFetching,
        isError,
        hasData: usersData !== undefined,
        hasResults: users.length > 0,
        isOffline: !isOnline,
        isPermissionDenied: getApiErrorCode(error) === 'FORBIDDEN',
    })

    const [updateAdminUserStatus, { isLoading: isUpdating }] =
        useUpdateAdminUserStatusMutation()

    const userToBlock = users.find((user) => user.id === userIdToBlock)

    const handleStatusChange = async (id: string, status: UserStatus) => {
        const user = users.find((user) => user.id === id)

        if (
            user &&
            !canManageUserStatus(currentUser?.role, user.role)
        ) {
            toast.error(t('adminUsers.adminStatusRestricted'))
            return
        }

        if (status === 'blocked') {
            setUserIdToBlock(id)
            return
        }

        try {
            await updateAdminUserStatus({ id, status }).unwrap()
            toast.success(t('adminUsers.statusUpdatedSuccessfully'))
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('adminUsers.statusUpdateFailed'),
            )

            toast.error(message)
        }
    }

    const handleConfirmBlockUser = async () => {
        if (!userIdToBlock) {
            return
        }

        try {
            await updateAdminUserStatus({
                id: userIdToBlock,
                status: 'blocked'
            }).unwrap()

            toast.success(t('adminUsers.blockedSuccessfully'))
            setUserIdToBlock(null)
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('adminUsers.blockFailed'),
            )

            toast.error(message)
        }

    }

    return (
        <main className="relative z-0 min-h-full bg-background px-4 py-8 lg:px-8">
            <section
                className="mx-auto max-w-6xl"
                aria-busy={isLoading || isFetching}
            >
                <PageHeader
                    eyebrow={t('workspace.admin')}
                    title={t('adminUsers.title')}
                    description={t('adminUsers.description')}
                    actions={
                        currentUser?.role === 'super_admin' && (
                            <Button onClick={() => setIsCreateDialogOpen(true)}>
                                {t('common.create')}
                            </Button>
                        )
                    }
                />

                <QueryRefreshStatus
                    isRefreshing={queryState === 'refreshing'}
                    label={t('common.refreshing')}
                />

                {queryState === 'loading' && (
                    <AdminUsersStateCard state="loading" />
                )}

                {queryState === 'error' && (
                    <AdminUsersStateCard
                        description={getApiErrorMessage(
                            error,
                            t('common.tryAgainLater'),
                        )}
                        onRetry={refetch}
                        state="error"
                    />
                )}

                {queryState === 'offline' && (
                    <AdminUsersStateCard
                        onRetry={refetch}
                        state="offline"
                    />
                )}

                {queryState === 'permission-denied' && (
                    <AdminUsersStateCard
                        onRetry={refetch}
                        state="permission-denied"
                    />
                )}

                {queryState === 'stale-error' && (
                    <QueryRefreshError
                        message={getApiErrorMessage(error, t('common.tryAgainLater'))}
                        onRetry={refetch}
                        retryLabel={t('common.retry')}
                    />
                )}

                {queryState === 'empty' && (
                    <AdminUsersStateCard state="empty" />
                )}

                {(queryState === 'success' || queryState === 'refreshing' || queryState === 'stale-error') && (
                    <AdminUsersList
                        isUpdating={isUpdating}
                        viewerRole={currentUser?.role}
                        users={users}
                        onStatusChange={handleStatusChange}
                    />
                )}
                <AdminUserBlockDialog
                    isLoading={isUpdating}
                    user={userToBlock}
                    onCancel={() => setUserIdToBlock(null)}
                    onConfirm={() => void handleConfirmBlockUser()}
                />
                <AdminCreateDialog
                    isOpen={isCreateDialogOpen}
                    onClose={() => setIsCreateDialogOpen(false)}
                />
            </section>
        </main>
    )
}
