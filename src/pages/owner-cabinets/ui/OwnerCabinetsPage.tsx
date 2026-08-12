import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import {
    useDeleteCabinetMutation,
    useGetOwnerCabinetsQuery,
} from '@/entities/cabinet'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { useTranslation } from '@/shared/lib/useTranslation'
import { OwnerCabinetsHeader } from './OwnerCabinetsHeader'
import { OwnerCabinetListItem } from './OwnerCabinetListItem'
import { buttonVariants } from '@/components/ui/button-variants'
import { ROUTES } from '@/shared/constants/routes'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'
import { QueryRefreshError, RetryButton } from '@/shared/ui/query-refresh-error'

export function OwnerCabinetsPage() {
    const { t } = useTranslation()
    const [cabinetIdToDelete, setCabinetIdToDelete] = useState<string | null>(null)

    const {
        data: cabinets = [],
        isFetching,
        isLoading,
        isError,
        error,
        refetch,
    } = useGetOwnerCabinetsQuery()
    const hasStaleCabinets = cabinets.length > 0

    const [deleteCabinet, { isLoading: isDeleting }] = useDeleteCabinetMutation()

    const cabinetToDelete = cabinets.find(
        (cabinet) => cabinet.id === cabinetIdToDelete
    )

    const handleConfirmDeleteCabinet = async () => {
        if (!cabinetToDelete) return

        try {
            await deleteCabinet({
                id: cabinetToDelete.id,
            }).unwrap()

            toast.success(t('cabinet.ownerList.deletedSuccessfully'))
            setCabinetIdToDelete(null)
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('cabinet.ownerList.deleteFailed'),
            )

            toast.error(message)
        }
    }

    return (
        <main className="min-h-screen bg-background px-4 py-8 lg:px-8">
            <section
                className="mx-auto max-w-6xl"
                aria-busy={isLoading || isFetching}
            >
                <OwnerCabinetsHeader />

                <QueryRefreshStatus
                    isRefreshing={isFetching && !isLoading}
                    label={t('common.refreshing')}
                />

                {isLoading && (
                    <div className="rounded-xl border bg-card p-8 shadow-sm">
                        <p className="text-muted-foreground">
                            {t('cabinet.ownerList.loading')}
                        </p>
                    </div>
                )}

                {isError && !hasStaleCabinets && (
                    <div className="rounded-xl border bg-card p-8 shadow-sm">
                        <p className="font-medium text-destructive">
                            {t('cabinet.ownerList.failedToLoad')}
                        </p>

                        <p className="mt-2 text-sm text-muted-foreground">
                            {getApiErrorMessage(
                                error,
                                t('common.tryAgainLater'),
                            )}
                        </p>
                        <RetryButton className="mt-5" onRetry={refetch} label={t('common.retry')} />
                    </div>
                )}

                {isError && hasStaleCabinets && (
                    <QueryRefreshError
                        message={getApiErrorMessage(error, t('common.tryAgainLater'))}
                        onRetry={refetch}
                        retryLabel={t('common.retry')}
                    />
                )}

                {!isLoading && !isError && cabinets.length === 0 && (
                    <div className="rounded-xl border bg-card p-8 shadow-sm">
                        <p className="font-medium">
                            {t('cabinet.ownerList.emptyTitle')}
                        </p>

                        <p className="mt-2 text-sm text-muted-foreground">
                            {t('cabinet.ownerList.emptyDescription')}
                        </p>
                        <Link to={ROUTES.ownerCabinetCreate} className={buttonVariants({ className: 'mt-5' })}>
                            {t('common.create')}
                        </Link>
                    </div>
                )}

                {!isLoading && (!isError || hasStaleCabinets) && cabinets.length > 0 && (
                    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                        <div className="hidden grid-cols-[1.5fr_1fr_1fr_0.7fr] gap-4 border-b bg-muted/30 px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground lg:grid">
                            <span>{t('cabinet.ownerList.cabinetColumn')}</span>
                            <span>{t('cabinet.ownerList.cityColumn')}</span>
                            <span>{t('cabinet.ownerList.priceColumn')}</span>
                            <span>{t('cabinet.ownerList.statusColumn')}</span>
                        </div>

                        <div className="divide-y">
                            {cabinets.map((cabinet) => (
                                <OwnerCabinetListItem
                                    key={cabinet.id}
                                    cabinet={cabinet}
                                    isDeleting={isDeleting}
                                    onDelete={setCabinetIdToDelete}
                                />
                            ))}
                        </div>
                    </div>
                )}
                
                <ConfirmDialog
                    isOpen={Boolean(cabinetToDelete)}
                    eyebrow={t('cabinet.ownerList.confirmDeleteEyebrow')}
                    title={t('cabinet.ownerList.confirmDeleteTitle')}
                    description={t('cabinet.ownerList.confirmDeleteDescription')}
                    cancelLabel={t('cabinet.ownerList.keepCabinet')}
                    confirmLabel={t('cabinet.ownerList.deleteCabinet')}
                    loadingLabel={t('cabinet.ownerList.deletingAction')}
                    isLoading={isDeleting}
                    confirmVariant="destructive"
                    onCancel={() => setCabinetIdToDelete(null)}
                    onConfirm={() => void handleConfirmDeleteCabinet()}
                >
                    {cabinetToDelete && (
                        <>
                            <p className="font-medium">
                                {cabinetToDelete.title}
                            </p>

                            <p className="mt-1 text-muted-foreground">
                                {cabinetToDelete.city}, {cabinetToDelete.address}
                            </p>

                            <p className="mt-1 text-muted-foreground">
                                {t('cabinet.ownerList.pricePerHour', {
                                    price: formatCurrency(cabinetToDelete.pricePerHour),
                                })}
                            </p>
                        </>
                    )}
                </ConfirmDialog>
            </section>
        </main>
    )
}
