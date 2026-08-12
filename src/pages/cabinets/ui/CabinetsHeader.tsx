import { useTranslation } from '@/shared/lib/useTranslation'

export function CabinetsHeader() {
    const { t } = useTranslation()

    return (
        <div className="mb-8 xl:mb-4">
            <p className="text-sm font-medium text-primary uppercase tracking-widest">
                {t('cabinet.publicList.eyebrow')}
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight xl:sr-only">
                {t('cabinet.publicList.title')}
            </h1>

            <p className="mt-4 max-w-2xl text-lg text-muted-foreground xl:hidden">
                {t('cabinet.publicList.description')}
            </p>
        </div>
    )
}
