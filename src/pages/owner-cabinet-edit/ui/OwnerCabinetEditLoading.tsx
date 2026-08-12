import { useTranslation } from '@/shared/lib/useTranslation'

export function OwnerCabinetEditLoading() {
    const { t } = useTranslation()

    return (
        <section className="space-y-6">
            <div>
                <p className="text-sm font-medium text-muted-foreground">
                    {t('workspace.owner')}
                </p>

                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                    {t('cabinet.form.editTitle')}
                </h1>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <p className="text-muted-foreground">
                    {t('cabinet.form.loadingCabinet')}
                </p>
            </div>
        </section>
    )
}
