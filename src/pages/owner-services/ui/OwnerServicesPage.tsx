import { CheckCircle2, Gift, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

import { useGetOwnerCabinetsQuery } from '@/entities/cabinet'
import {
    useDeleteServiceMutation,
    useGetOwnerServicesQuery,
} from '@/entities/service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'
import { QueryRefreshError, RetryButton } from '@/shared/ui/query-refresh-error'

import { CreateServiceForm } from './CreateServiceForm'
import { DeleteServiceDialog } from './DeleteServiceDialog'
import { OwnerServicesHeader } from './OwnerServicesHeader'
import { OwnerServicesList } from './OwnerServicesList'

export function OwnerServicesPage() {
    const { t } = useTranslation()
    const [serviceIdToDelete, setServiceIdToDelete] = useState<string | null>(null)
    const [serviceIdToEdit, setServiceIdToEdit] = useState<string | null>(null)

    const {
        data: services = [],
        isFetching,
        isLoading,
        isError,
        error,
        refetch,
    } = useGetOwnerServicesQuery()
    const hasStaleServices = services.length > 0

    const serviceToDelete = services.find(
        (service) => service.id === serviceIdToDelete
    )

    const {
        data: cabinets = [],
        isLoading: isCabinetsLoading,
    } = useGetOwnerCabinetsQuery()

    const [deleteService, { isLoading: isDeleting }] =
        useDeleteServiceMutation()

    const handleConfirmDeleteService = async () => {
        if (!serviceToDelete) {
            return
        }

        try {
            await deleteService({
                id: serviceToDelete.id,
                cabinetId: serviceToDelete.cabinetId,
            }).unwrap()

            toast.success(t('service.form.deletedSuccessfully'))
            setServiceIdToDelete(null)

            if (serviceIdToEdit === serviceToDelete.id) {
                setServiceIdToEdit(null)
            }
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('service.form.deletedFailed'),
            )

            toast.error(message)
        }
    }

    return (
        <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10">
            <section
                className="mx-auto max-w-6xl"
                aria-busy={isLoading || isFetching}
            >
                <div className="rounded-[var(--radius-panel)] bg-hero-overlay p-5 text-primary-foreground shadow-sm sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground/60">{t('workspace.owner')}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{t('service.services')}</h1><p className="mt-2 max-w-2xl text-sm font-medium text-primary-foreground/70">{t('service.form.pageDescription')}</p></div><OwnerServicesHeader /></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-[var(--radius-card)] border border-primary-foreground/15 bg-primary-foreground/10 p-3"><CheckCircle2 className="size-5 text-status-success-foreground" /><p className="mt-2 text-xs font-bold">{t('ownerDashboard.growth.freePlan')}</p></div><div className="rounded-[var(--radius-card)] border border-primary-foreground/15 bg-primary-foreground/10 p-3"><Gift className="size-5 text-primary" /><p className="mt-2 text-xs font-bold">{t('ownerDashboard.growth.bonusesTitle')}</p></div><div className="rounded-[var(--radius-card)] border border-primary-foreground/15 bg-primary-foreground/10 p-3"><MessageCircle className="size-5 text-primary" /><p className="mt-2 text-xs font-bold">{t('ownerDashboard.growth.messagesTitle')}</p></div></div></div>

                <QueryRefreshStatus
                    isRefreshing={isFetching && !isLoading}
                    label={t('common.refreshing')}
                />

                <CreateServiceForm
                    cabinets={cabinets}
                    isCabinetsLoading={isCabinetsLoading}
                />

                {isLoading && (
                    <div className="rounded-xl border bg-card p-8 shadow-sm">
                        <p className="text-muted-foreground">
                            {t('service.form.loadingServices')}
                        </p>
                    </div>
                )}

                {isError && !hasStaleServices && (
                    <div className="rounded-xl border bg-card p-8 shadow-sm">
                        <p className="font-medium text-destructive">
                            {t('service.form.failedToLoadServices')}
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

                {isError && hasStaleServices && (
                    <QueryRefreshError
                        message={getApiErrorMessage(error, t('common.tryAgainLater'))}
                        onRetry={refetch}
                        retryLabel={t('common.retry')}
                    />
                )}

                {!isLoading && !isError && services.length === 0 && (
                    <div className="rounded-xl border bg-card p-8 shadow-sm">
                        <p className="font-medium">
                            {t('service.form.noServicesTitle')}
                        </p>

                        <p className="mt-2 text-sm text-muted-foreground">
                            {t('service.form.noServicesDescription')}
                        </p>
                    </div>
                )}

                {!isLoading && (!isError || hasStaleServices) && services.length > 0 && (
                    <OwnerServicesList
                        isDeleting={isDeleting}
                        serviceIdToEdit={serviceIdToEdit}
                        services={services}
                        onCancelEdit={() => setServiceIdToEdit(null)}
                        onDelete={setServiceIdToDelete}
                        onEdit={setServiceIdToEdit}
                    />
                )}

                <DeleteServiceDialog
                    isLoading={isDeleting}
                    service={serviceToDelete}
                    onCancel={() => setServiceIdToDelete(null)}
                    onConfirm={() => void handleConfirmDeleteService()}
                />
            </section>
        </main>
    )
}
