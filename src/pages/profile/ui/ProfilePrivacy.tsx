import { Download, ShieldCheck, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import {
    useCancelAccountDeletionMutation,
    useGetAccountDeletionRequestQuery,
    useLazyExportMyDataQuery,
    useRequestAccountDeletionMutation,
} from '@/entities/user'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { formatDateTime } from '@/shared/lib/formatDateTime'
import { useTranslation } from '@/shared/lib/useTranslation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function ProfilePrivacy() {
    const { t } = useTranslation()
    const [reason, setReason] = useState('')
    const [isReasonFormOpen, setIsReasonFormOpen] = useState(false)
    const [exportData, { isFetching: isExporting }] = useLazyExportMyDataQuery()
    const { data: deletionRequest, isLoading: isLoadingDeletion } = useGetAccountDeletionRequestQuery()
    const [requestDeletion, { isLoading: isRequestingDeletion }] = useRequestAccountDeletionMutation()
    const [cancelDeletion, { isLoading: isCancellingDeletion }] = useCancelAccountDeletionMutation()

    const handleExport = async () => {
        try {
            const data = await exportData().unwrap()
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `autocarehub-my-data-${new Date().toISOString().slice(0, 10)}.json`
            link.click()
            window.setTimeout(() => URL.revokeObjectURL(url), 0)
            toast.success(t('profile.privacy.exportSuccess'))
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('profile.privacy.exportError')))
        }
    }

    const handleRequestDeletion = async () => {
        try {
            await requestDeletion({ reason: reason.trim() || undefined }).unwrap()
            setReason('')
            setIsReasonFormOpen(false)
            toast.success(t('profile.privacy.requestSuccess'))
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('profile.privacy.requestError')))
        }
    }

    const handleCancelDeletion = async () => {
        if (!window.confirm(t('profile.privacy.cancelConfirm'))) return

        try {
            await cancelDeletion().unwrap()
            toast.success(t('profile.privacy.cancelSuccess'))
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('profile.privacy.cancelError')))
        }
    }

    return (
        <section data-testid="profile-privacy" className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <ShieldCheck className="size-5 text-primary" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">{t('profile.privacy.title')}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{t('profile.privacy.description')}</p>
                </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border bg-muted/20 p-4">
                    <h3 className="font-semibold">{t('profile.privacy.exportTitle')}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{t('profile.privacy.exportDescription')}</p>
                    <Button type="button" variant="outline" className="mt-4" onClick={() => void handleExport()} loading={isExporting}>
                        {!isExporting && <Download className="mr-2 size-4" />}
                        {isExporting ? t('profile.privacy.exporting') : t('profile.privacy.exportAction')}
                    </Button>
                </div>

                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <h3 className="font-semibold">{t('profile.privacy.deletionTitle')}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{t('profile.privacy.deletionDescription')}</p>

                    {isLoadingDeletion ? (
                        <div role="status" aria-label={t('common.loading')} className="mt-4 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                            <Skeleton className="h-9 w-36 rounded-md" />
                        </div>
                    ) : deletionRequest ? (
                        <div className="mt-4 rounded-md border bg-background p-3 text-sm">
                            <p className="font-semibold">{t('profile.privacy.requestPending')}</p>
                            <p className="mt-1 text-muted-foreground">
                                {t('profile.privacy.requestedAt', { date: formatDateTime(deletionRequest.requestedAt) })}
                            </p>
                            <Button type="button" variant="outline" className="mt-3" onClick={() => void handleCancelDeletion()} loading={isCancellingDeletion}>
                                {!isCancellingDeletion && <X className="mr-2 size-4" />}
                                {isCancellingDeletion ? t('common.loading') : t('profile.privacy.cancelRequest')}
                            </Button>
                        </div>
                    ) : isReasonFormOpen ? (
                        <div className="mt-4 rounded-md border bg-background p-3">
                            <label className="grid gap-2 text-sm font-medium" htmlFor="profile-deletion-reason">
                                {t('profile.privacy.reasonLabel')}
                                <textarea
                                    id="profile-deletion-reason"
                                    value={reason}
                                    onChange={(event) => setReason(event.target.value)}
                                    maxLength={500}
                                    rows={3}
                                    placeholder={t('profile.privacy.reasonPlaceholder')}
                                    className="resize-y rounded-md border bg-background px-3 py-2 font-normal"
                                />
                            </label>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button type="button" variant="destructive" onClick={() => void handleRequestDeletion()} loading={isRequestingDeletion}>
                                    {!isRequestingDeletion && <Trash2 className="mr-2 size-4" />}
                                    {isRequestingDeletion ? t('common.loading') : t('profile.privacy.confirmRequest')}
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => { setIsReasonFormOpen(false); setReason('') }} disabled={isRequestingDeletion}>
                                    {t('common.cancel')}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button type="button" variant="outline" className="mt-4" onClick={() => setIsReasonFormOpen(true)}>
                            <Trash2 className="mr-2 size-4" />
                            {t('profile.privacy.requestAction')}
                        </Button>
                    )}
                </div>
            </div>
        </section>
    )
}
