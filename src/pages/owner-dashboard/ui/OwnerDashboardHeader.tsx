import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button-variants'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
export function OwnerDashboardHeader() {
    const { t } = useTranslation()

    return (
        <PageHeader
            eyebrow={t('workspace.owner')}
            title={t('ownerDashboard.title')}
            description={t('ownerDashboard.description')}
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
