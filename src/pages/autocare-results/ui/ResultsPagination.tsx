import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useTranslation } from '@/shared/lib/useTranslation'

type ResultsPaginationProps = {
    page: number
    totalPages: number
    onChange: (page: number) => void
}

export function ResultsPagination({ page, totalPages, onChange }: ResultsPaginationProps) {
    const { t } = useTranslation()
    if (totalPages <= 1) return null

    return (
        <nav className="flex shrink-0 items-center justify-center gap-2 pt-2" aria-label={t('autocare.paginationLabel')}>
            <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)} className="inline-flex size-9 items-center justify-center rounded-[var(--radius-control)] border border-border bg-card text-foreground disabled:cursor-not-allowed disabled:opacity-40" aria-label={t('autocare.previousPage')}>
                <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-20 text-center text-xs font-bold text-muted-foreground">{page} / {totalPages}</span>
            <button type="button" disabled={page === totalPages} onClick={() => onChange(page + 1)} className="inline-flex size-9 items-center justify-center rounded-[var(--radius-control)] border border-border bg-card text-foreground disabled:cursor-not-allowed disabled:opacity-40" aria-label={t('autocare.nextPage')}>
                <ChevronRight className="size-4" />
            </button>
        </nav>
    )
}
