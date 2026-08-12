import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button-variants'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

export function OwnerServicesHeader() {
    const { t } = useTranslation()

    return <Link to={ROUTES.ownerCabinets} className={buttonVariants({ variant: 'outline', size: 'sm' })}>{t('service.form.viewCabinets')}</Link>
}
