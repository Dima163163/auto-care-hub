import type { ReviewStatus } from '@/entities/review'
import type { TranslationKey } from '@/shared/lib/i18n'

export const reviewStatusLabelKeys = {
    pending: 'review.pendingStatusLabel',
    approved: 'review.approvedStatusLabel',
    rejected: 'review.rejectedStatusLabel',
} satisfies Record<ReviewStatus, TranslationKey>

export const reviewStatusClassNames = {
    pending: 'border-status-warning-border bg-status-warning-surface text-status-warning-foreground',
    approved: 'border-status-success-border bg-status-success-surface text-status-success-foreground',
    rejected: 'border-status-danger-border bg-status-danger-surface text-status-danger-foreground',
} satisfies Record<ReviewStatus, string>
