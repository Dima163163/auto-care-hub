import { useTranslation } from '@/shared/lib/useTranslation'
import { Skeleton } from '@/components/ui/skeleton'

export function CabinetDetailsLoading() {
    const { t } = useTranslation()

    return (
        <main className="min-h-screen bg-background px-4 py-10">
            <section className="mx-auto max-w-6xl">
                <div role="status" className="rounded-xl border bg-card p-8 shadow-sm">
                    <span className="sr-only">{t('cabinet.details.loading')}</span>
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-2/5" />
                        <Skeleton className="h-5 w-3/5" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                </div>
            </section>
        </main>
    )
}
