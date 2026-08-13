import { useState } from 'react'
import { toast } from 'sonner'

import {
    type CabinetStatus,
    useGetAdminCabinetsQuery,
    useUpdateAdminCabinetStatusMutation
} from '@/entities/cabinet'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { QueryRefreshError } from '@/shared/ui/query-refresh-error'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'

import { AdminCabinetBlockDialog } from './AdminCabinetBlockDialog'
import { AdminCabinetsList } from './AdminCabinetsList'
import { AdminCabinetsStateCard } from './AdminCabinetsStateCard'

export function AdminCabinetsPage() {
    const { t } = useTranslation()
    const [cabinetIdToBlock, setCabinetIdToBlock] = useState<string | null>(null)

    const {
        data: cabinets = [],
        isFetching,
        isLoading,
        isError,
        error,
        refetch,
    } = useGetAdminCabinetsQuery()
    const hasStaleCabinets = cabinets.length > 0

    const cabinetToBlock = cabinets.find(
        (cabinet) => cabinet.id === cabinetIdToBlock
    )

    const [updateAdminCabinetStatus, { isLoading: isUpdating }] = useUpdateAdminCabinetStatusMutation()

    const handleStatusChange = async (id: string, status: CabinetStatus) => {
        if (status === 'blocked') {
            setCabinetIdToBlock(id)
            return
        }
        try {
            await updateAdminCabinetStatus({ id, status }).unwrap()
            toast.success(t('adminCabinets.statusUpdatedSuccessfully'))
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('adminCabinets.statusUpdateFailed'),
            )

            toast.error(message)
        }
    }

    const handleConfirmBlockCabinet = async () => {
        if (!cabinetIdToBlock) {
            return
        }

        try {
            await updateAdminCabinetStatus({
                id: cabinetIdToBlock,
                status: 'blocked'
            }).unwrap()
            toast.success(t('adminCabinets.blockedSuccessfully'))
            setCabinetIdToBlock(null)
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('adminCabinets.blockFailed'),
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
                    title={t('adminCabinets.title')}
                    description={t('adminCabinets.description')}
                />

                <QueryRefreshStatus
                    isRefreshing={isFetching && !isLoading}
                    label={t('common.refreshing')}
                />

                {isLoading && (
                    <AdminCabinetsStateCard state="loading" />
                )}

                {isError && !hasStaleCabinets && (
                    <AdminCabinetsStateCard
                        description={getApiErrorMessage(
                            error,
                            t('common.tryAgainLater'),
                        )}
                        onRetry={refetch}
                        state="error"
                    />
                )}

                {isError && hasStaleCabinets && (
                    <QueryRefreshError
                        message={getApiErrorMessage(error, t('common.tryAgainLater'))}
                        onRetry={refetch}
                        retryLabel={t('common.retry')}
                    />
                )}

                {!isLoading && !isError && cabinets.length === 0 && (
                    <AdminCabinetsStateCard state="empty" />
                )}

                {!isLoading && (!isError || hasStaleCabinets) && cabinets.length > 0 && (
                    <AdminCabinetsList
                        cabinets={cabinets}
                        isUpdating={isUpdating}
                        onStatusChange={handleStatusChange}
                    />
                )}
                <AdminCabinetBlockDialog
                    cabinet={cabinetToBlock}
                    isLoading={isUpdating}
                    onCancel={() => setCabinetIdToBlock(null)}
                    onConfirm={() => void handleConfirmBlockCabinet()}
                />
            </section>
        </main>
    )
}
