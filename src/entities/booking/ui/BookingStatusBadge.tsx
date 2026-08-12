import type { BookingStatus } from '../model/types'
import { StatusBadge } from '@/shared/ui/status-badge'

type BookingStatusBadgeProps = {
    status: BookingStatus
}

const statusVariant = {
    pending: 'warning',
    confirmed: 'success',
    cancelled: 'neutral',
    completed: 'info',
} as const satisfies Record<BookingStatus, 'info' | 'neutral' | 'success' | 'warning'>

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
    return (
        <StatusBadge className="capitalize" variant={statusVariant[status]}>
            {status}
        </StatusBadge>
    )
}
