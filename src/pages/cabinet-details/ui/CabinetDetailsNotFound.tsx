import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

export function CabinetDetailsNotFound() {
    const { t } = useTranslation()

    return (
        <main className="min-h-screen bg-background px-4 py-10">
            <section className="mx-auto max-w-6xl">
                <div className="rounded-xl border bg-card p-8 shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground">
                        {t('cabinet.cabinetDetails')}
                    </p>

                    <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                        {t('cabinet.details.notFoundTitle')}
                    </h1>

                    <p className="mt-4 max-w-2xl text-muted-foreground">
                        {t('cabinet.details.notFoundDescription')}
                    </p>

                    <Link
                        to={ROUTES.cabinets}
                        className={cn(
                            buttonVariants({ variant: 'outline', size: 'sm' }),
                            'mt-6',
                        )}
                    >
                        {t('cabinet.details.backToCabinets')}
                    </Link>
                </div>
            </section>
        </main>
    )
}
