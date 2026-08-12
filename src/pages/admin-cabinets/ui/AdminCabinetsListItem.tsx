import {
    CabinetStatusBadge,
    type Cabinet,
    type CabinetStatus,
} from '@/entities/cabinet'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { useTranslation } from '@/shared/lib/useTranslation'

type AdminCabinetsListItemProps = {
    cabinet: Cabinet
    isUpdating: boolean
    onStatusChange: (id: string, status: CabinetStatus) => void
}

export function AdminCabinetsListItem({
    cabinet,
    isUpdating,
    onStatusChange,
}: AdminCabinetsListItemProps) {
    const { t } = useTranslation()

    return (
        <div className="flex flex-col gap-4 px-5 py-4 lg:grid lg:grid-cols-[1.5fr_1fr_1fr_1fr_0.8fr_1fr]">
            <div>
                <p className="font-medium">
                    {cabinet.title}
                </p>

                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {cabinet.description}
                </p>
            </div>

            <div className="text-sm text-muted-foreground">
                <MobileLabel label={t('user.owner')} />
                {cabinet.ownerId}
            </div>

            <div className="text-sm text-muted-foreground">
                <MobileLabel label={t('cabinet.form.cityLabel')} />
                {cabinet.city}
            </div>

            <div className="text-sm font-medium">
                <MobileLabel label={t('service.form.priceColumn')} />
                {formatCurrency(cabinet.pricePerHour)}
            </div>

            <div className="flex items-center justify-between gap-3 lg:block">
                <MobileLabel label={t('common.status')} inline />
                <CabinetStatusBadge status={cabinet.status} />
            </div>

            <div>
                <MobileLabel label={t('common.actions')} />
                <select
                    value={cabinet.status}
                    disabled={isUpdating}
                    aria-busy={isUpdating || undefined}
                    onChange={(event) =>
                        void onStatusChange(
                            cabinet.id,
                            event.target.value as CabinetStatus,
                        )
                    }
                    className="min-h-11 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <option value="draft">{t('cabinet.draftStatusLabel')}</option>
                    <option value="active">{t('cabinet.activeStatusLabel')}</option>
                    <option value="blocked">{t('cabinet.blockedStatusLabel')}</option>
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
