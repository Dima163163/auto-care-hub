import { Link } from 'react-router'

import { cn } from '@/lib/utils'
import { ROUTES } from '@/shared/constants/routes'
import { buttonVariants } from '@/components/ui/button-variants'
import { useTranslation } from '@/shared/lib/useTranslation'

export function NotFoundPage() {
    const { t } = useTranslation()

    return (
        <main className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-background px-4 py-12">
            <div className="max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    404
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                    {t('notFound.title')}
                </h1>

                <p className="mt-4 text-muted-foreground">
                    {t('notFound.description')}
                </p>

                <Link
                    to={ROUTES.home}
                    className={cn(buttonVariants(), 'mt-6')}
                >
                    {t('notFound.goHome')}
                </Link>
            </div>
        </main>
    )
}
