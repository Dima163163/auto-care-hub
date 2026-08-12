import { RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useTranslation } from '@/shared/lib/useTranslation'

type FormDraftNoticeProps = {
    onDiscard: () => void
}

export function FormDraftNotice({ onDiscard }: FormDraftNoticeProps) {
    const { t } = useTranslation()

    return (
        <div
            role="status"
            aria-live="polite"
            className="mb-5 flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
            <div>
                <p className="text-sm font-semibold text-foreground">
                    {t('cabinet.form.draftRestoredTitle')}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t('cabinet.form.draftRestoredDescription')}
                </p>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={onDiscard}>
                <RotateCcw aria-hidden="true" />
                {t('cabinet.form.discardDraft')}
            </Button>
        </div>
    )
}
