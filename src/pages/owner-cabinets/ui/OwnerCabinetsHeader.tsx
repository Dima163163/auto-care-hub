import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button-variants'
import { PageHeader } from '@/shared/ui/page-header'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

export function OwnerCabinetsHeader() {
    const { t } = useTranslation()

    return (
        <PageHeader
            eyebrow={t('workspace.owner')}
            title={t('cabinet.ownerList.title')}
            description={t('cabinet.ownerList.description')}
            actions={
                <Link
                    to={ROUTES.ownerCabinetCreate}
                    className={buttonVariants({ size: 'sm' })}
                >
                    {t('cabinet.form.createAction')}
                </Link>
            }
        />
    )
}
