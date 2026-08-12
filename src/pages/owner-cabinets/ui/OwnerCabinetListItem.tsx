import { Link } from 'react-router'
import { CabinetStatusBadge, type Cabinet } from '@/entities/cabinet'
import { buttonVariants } from '@/components/ui/button-variants'
import { Button } from '@/components/ui/button'
import { routePaths } from '@/shared/constants/routes'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { useTranslation } from '@/shared/lib/useTranslation'

type OwnerCabinetListItemProps = {
    cabinet: Cabinet
    isDeleting: boolean
    onDelete: (id: string) => void
}

export function OwnerCabinetListItem({ cabinet, isDeleting, onDelete }: OwnerCabinetListItemProps) {
    const { t } = useTranslation()

    return (
        <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-2">
            <Link
                to={routePaths.cabinetDetails(cabinet.id)}
                className="flex grow flex-col gap-3 rounded-xl transition-colors hover:bg-muted/60 lg:grid lg:grid-cols-[1.5fr_1fr_1fr_0.7fr] lg:items-center lg:gap-4 lg:rounded-none"
            >
                <div>
                    <p className="font-medium">
                        {cabinet.title}
                    </p>

                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {cabinet.description}
                    </p>
                </div>

                <div className="text-sm text-muted-foreground">
                    <span className="mb-1 block text-xs font-medium uppercase text-muted-foreground lg:hidden">
                        {t('cabinet.ownerList.cityColumn')}
                    </span>
                    {cabinet.city}
                </div>

                <div className="text-sm font-medium">
                    <span className="mb-1 block text-xs font-medium uppercase text-muted-foreground lg:hidden">
                        {t('cabinet.ownerList.priceColumn')}
                    </span>
                    {formatCurrency(cabinet.pricePerHour)}
                </div>

                <div className="flex items-center justify-between gap-3 lg:block">
                    <span className="text-xs font-medium uppercase text-muted-foreground lg:hidden">
                        {t('cabinet.ownerList.statusColumn')}
                    </span>
                    <CabinetStatusBadge status={cabinet.status} />
                </div>
            </Link>
            
            <div className="flex gap-2 lg:flex-col">
                <Link
                    to={routePaths.ownerCabinetEdit(cabinet.id)}
                    className={buttonVariants({
                        variant: 'outline',
                        size: 'sm',
                        className: 'min-h-11 flex-1 lg:flex-none',
                    })}
                >
                    {t('common.edit')}
                </Link>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={isDeleting}
                    className="min-h-11 flex-1 lg:flex-none"
                    onClick={() => onDelete(cabinet.id)}
                >
                    {t('common.delete')}
                </Button>
            </div>
        </div>
    )
}
