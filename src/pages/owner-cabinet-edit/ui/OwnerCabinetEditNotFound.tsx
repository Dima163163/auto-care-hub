import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button-variants'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

export function OwnerCabinetEditNotFound() {
    const { t } = useTranslation()

    return (
        <section className="space-y-6">
            <div>
                <p className="text-sm font-medium text-muted-foreground">
                    {t('workspace.owner')}
                </p>

                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                    {t('cabinet.form.notFoundTitle')}
                </h1>

                <p className="mt-3 max-w-2xl text-muted-foreground">
                    {t('cabinet.form.notFoundDescription')}
                </p>
            </div>

            <Link
                to={ROUTES.ownerCabinets}
                className={buttonVariants({ variant: 'outline' })}
            >
                {t('cabinet.form.backToCabinets')}
            </Link>
        </section>
    )
}
