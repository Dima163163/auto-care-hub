import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button-variants'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'

export function OwnerCabinetEditHeader() {
    const { t } = useTranslation()

    return (
        <PageHeader
            eyebrow={t('workspace.owner')}
            title={t('cabinet.form.editTitle')}
            description={t('cabinet.form.editDescription')}
            actions={
                <Link
                    to={ROUTES.ownerCabinets}
                    className={buttonVariants({ variant: 'outline' })}
                >
                    {t('cabinet.form.backToCabinets')}
                </Link>
            }
        />
    )
}
