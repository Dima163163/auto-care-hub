import { useState, type FormEvent } from 'react'
import { Ban, Clock3, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import {
    useCreateSecurityMitigationMutation,
    useExtendSecurityMitigationMutation,
    useGetSecurityMitigationsQuery,
    useRevokeSecurityMitigationMutation,
    type SecurityMitigation,
} from '@/features/admin/api/adminApi'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Button } from '@/components/ui/button'

const durationOptions = [15, 60, 240, 1_440]

function formatDate(value: string) {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function SecurityMitigationsPanel() {
    const { t } = useTranslation()
    const { data: mitigations = [], isFetching } = useGetSecurityMitigationsQuery({ status: 'active' })
    const [createMitigation, { isLoading: isCreating }] = useCreateSecurityMitigationMutation()
    const [extendMitigation, { isLoading: isExtending }] = useExtendSecurityMitigationMutation()
    const [revokeMitigation, { isLoading: isRevoking }] = useRevokeSecurityMitigationMutation()
    const [ipAddress, setIpAddress] = useState('')
    const [reason, setReason] = useState('')
    const [ttlMinutes, setTtlMinutes] = useState('60')
    const [pendingRevoke, setPendingRevoke] = useState<SecurityMitigation | null>(null)
    const [pendingExtend, setPendingExtend] = useState<SecurityMitigation | null>(null)
    const [extensionMinutes, setExtensionMinutes] = useState('15')

    const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const duration = Number(ttlMinutes)
        if (!Number.isSafeInteger(duration) || duration < 1 || duration > 1_440) {
            toast.error(t('securityCenter.mitigationCreateFailed'))
            return
        }
        try {
            await createMitigation({ ipAddress, reason, ttlMinutes: duration }).unwrap()
            setIpAddress('')
            setReason('')
            toast.success(t('securityCenter.mitigationCreated'))
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('securityCenter.mitigationCreateFailed')))
        }
    }

    const handleRevoke = async () => {
        if (!pendingRevoke) return
        try {
            await revokeMitigation(pendingRevoke.id).unwrap()
            setPendingRevoke(null)
            toast.success(t('securityCenter.mitigationRevoked'))
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('securityCenter.mitigationRevokeFailed')))
        }
    }

    const handleExtend = async () => {
        if (!pendingExtend) return
        const duration = Number(extensionMinutes)
        if (!Number.isSafeInteger(duration) || duration < 1 || duration > 1_440) {
            toast.error(t('securityCenter.mitigationExtendFailed'))
            return
        }
        try {
            await extendMitigation({ id: pendingExtend.id, extensionMinutes: duration }).unwrap()
            setPendingExtend(null)
            toast.success(t('securityCenter.mitigationExtended'))
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('securityCenter.mitigationExtendFailed')))
        }
    }

    return (
        <>
            <section className="mt-6 rounded-lg border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="size-5 text-primary" />
                            <h2 className="font-semibold">{t('securityCenter.mitigationsTitle')}</h2>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{t('securityCenter.mitigationsDescription')}</p>
                    </div>
                    <StatusBadge variant="info">{t('securityCenter.activeMitigations')}: {mitigations.length}</StatusBadge>
                </div>

                <form className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_150px_auto]" onSubmit={(event) => void handleCreate(event)}>
                    <label className="text-sm font-medium">
                        <span className="mb-2 block">{t('securityCenter.ipAddressLabel')}</span>
                        <input value={ipAddress} onChange={(event) => setIpAddress(event.target.value)} placeholder={t('securityCenter.ipAddressPlaceholder')} maxLength={64} className="h-10 w-full rounded-md border bg-background px-3" required />
                    </label>
                    <label className="text-sm font-medium">
                        <span className="mb-2 block">{t('securityCenter.mitigationReason')}</span>
                        <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t('securityCenter.mitigationReasonPlaceholder')} maxLength={500} className="h-10 w-full rounded-md border bg-background px-3" required />
                    </label>
                    <label className="text-sm font-medium">
                        <span className="mb-2 block">{t('securityCenter.mitigationDuration')}</span>
                        <select value={ttlMinutes} onChange={(event) => setTtlMinutes(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3">
                            {durationOptions.map((minutes) => <option key={minutes} value={minutes}>{minutes} {t('securityCenter.minutes')}</option>)}
                        </select>
                    </label>
                    <Button type="submit" className="mt-auto min-h-10" loading={isCreating}>
                        {!isCreating && <Plus className="mr-2 size-4" />}
                        {isCreating ? t('securityCenter.applyingMitigation') : t('securityCenter.applyMitigation')}
                    </Button>
                </form>

                <div className="mt-5 space-y-2" aria-busy={isFetching}>
                    {mitigations.length === 0 && <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{t('securityCenter.noActiveMitigations')}</p>}
                    {mitigations.map((mitigation) => (
                        <div key={mitigation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <code className="text-sm font-medium">{mitigation.displayValue}</code>
                                    <StatusBadge variant="neutral"><Clock3 className="mr-1 size-3" />{formatDate(mitigation.expiresAt)}</StatusBadge>
                                </div>
                                <p className="mt-1 break-words text-sm text-muted-foreground">{mitigation.reason}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setPendingExtend(mitigation)} disabled={isExtending || isRevoking}>
                                    <RefreshCw className="mr-1.5 size-4" />
                                    {t('securityCenter.extendMitigation')}
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setPendingRevoke(mitigation)} disabled={isExtending || isRevoking}>
                                    <Ban className="mr-1.5 size-4" />
                                    {t('securityCenter.revokeMitigation')}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <ConfirmDialog
                isOpen={Boolean(pendingRevoke)}
                eyebrow={t('securityCenter.revokeMitigationEyebrow')}
                title={t('securityCenter.revokeMitigationTitle')}
                description={t('securityCenter.revokeMitigationDescription')}
                cancelLabel={t('common.cancel')}
                confirmLabel={t('securityCenter.revokeMitigation')}
                loadingLabel={t('securityCenter.revokingMitigation')}
                confirmVariant="destructive"
                isLoading={isRevoking}
                onCancel={() => setPendingRevoke(null)}
                onConfirm={() => void handleRevoke()}
            >
                {pendingRevoke && <><p className="font-medium">{pendingRevoke.displayValue}</p><p className="mt-1 text-muted-foreground">{pendingRevoke.reason}</p></>}
            </ConfirmDialog>

            <ConfirmDialog
                isOpen={Boolean(pendingExtend)}
                eyebrow={t('securityCenter.extendMitigationEyebrow')}
                title={t('securityCenter.extendMitigationTitle')}
                description={t('securityCenter.extendMitigationDescription')}
                cancelLabel={t('common.cancel')}
                confirmLabel={t('securityCenter.extendMitigation')}
                loadingLabel={t('securityCenter.extendingMitigation')}
                isLoading={isExtending}
                onCancel={() => setPendingExtend(null)}
                onConfirm={() => void handleExtend()}
            >
                {pendingExtend && (
                    <div className="space-y-3">
                        <p className="font-medium">{pendingExtend.displayValue}</p>
                        <label className="block text-sm font-medium">
                            <span className="mb-2 block">{t('securityCenter.extensionDuration')}</span>
                            <select value={extensionMinutes} onChange={(event) => setExtensionMinutes(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3">
                                {durationOptions.map((minutes) => <option key={minutes} value={minutes}>{minutes} {t('securityCenter.minutes')}</option>)}
                            </select>
                        </label>
                    </div>
                )}
            </ConfirmDialog>
        </>
    )
}
