import { AppDataSource } from '../../database/data-source.js'
import {
    BookingPaymentEntity,
    BookingPaymentStatus,
} from '../../entities/booking/booking-payment.entity.js'
import {
    BookingPaymentInvoiceEntity,
} from '../../entities/booking/booking-payment-invoice.entity.js'
import { getMaintenanceBacklogAgeMs } from '../jobs/maintenance-backlog-policy.js'
import { getMaintenanceDeleteBatchSize } from '../jobs/maintenance-cleanup-policy.js'
import { metrics } from '../../shared/observability/metrics.js'
import { getPaymentInvoiceStatus } from './payment-invoice-state.js'

export type PaymentInvoiceBackfillResult = {
    checked: number
    created: number
    skipped: number
    errors: number
}

export type PaymentInvoiceBackfillPreflightResult = {
    dryRun: true
    candidateCount: number
    wouldCreate: number
    oldestAgeMs: number
    statusCounts: Record<BookingPaymentStatus, number>
}

export function getInvoiceBackfillStatuses() {
    return [
        BookingPaymentStatus.Paid,
        BookingPaymentStatus.PartiallyRefunded,
        BookingPaymentStatus.Refunded,
    ] as const
}

export function toPaymentInvoiceBackfillRecord(
    payment: Pick<BookingPaymentEntity, 'id' | 'bookingId' | 'grossAmount' | 'currency' | 'status' | 'createdAt'>,
) {
    const status = getPaymentInvoiceStatus(payment.status)
    if (!status) throw new Error('Only settled payments can be backfilled into invoices.')

    return {
        paymentId: payment.id,
        bookingId: payment.bookingId,
        invoiceId: `inv_${payment.id}`,
        amount: payment.grossAmount,
        currency: payment.currency,
        status,
        issuedAt: payment.createdAt,
    } satisfies Partial<BookingPaymentInvoiceEntity>
}

export function createPaymentInvoiceBackfillPreflight(input: {
    candidateCount: number
    oldestAgeMs: number
    statusCounts: Record<BookingPaymentStatus, number>
}): PaymentInvoiceBackfillPreflightResult {
    const values = [input.candidateCount, input.oldestAgeMs, ...Object.values(input.statusCounts)]
    if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
        throw new Error('Payment invoice backfill preflight counters are invalid.')
    }

    const statusTotal = Object.values(input.statusCounts).reduce((total, count) => total + count, 0)
    if (statusTotal !== input.candidateCount) {
        throw new Error('Payment invoice backfill preflight counters are inconsistent.')
    }

    return {
        dryRun: true,
        candidateCount: input.candidateCount,
        wouldCreate: input.candidateCount,
        oldestAgeMs: input.oldestAgeMs,
        statusCounts: input.statusCounts,
    }
}

export async function getPaymentInvoiceBackfillPreflight(
    now = new Date(),
): Promise<PaymentInvoiceBackfillPreflightResult> {
    const paymentRepository = AppDataSource.getRepository(BookingPaymentEntity)
    const baseQuery = () => paymentRepository
        .createQueryBuilder('payment')
        .leftJoin(
            BookingPaymentInvoiceEntity,
            'invoice',
            'invoice.paymentId = payment.id',
        )
        .where('payment.status IN (:...statuses)', {
            statuses: getInvoiceBackfillStatuses(),
        })
        .andWhere('invoice.id IS NULL')

    const [candidateCount, oldestRow, statusRows] = await Promise.all([
        baseQuery().getCount(),
        baseQuery()
            .select('MIN(payment.createdAt)', 'oldestCreatedAt')
            .getRawOne<{ oldestCreatedAt: Date | null }>(),
        baseQuery()
            .select('payment.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('payment.status')
            .getRawMany<{ status: BookingPaymentStatus; count: string }>(),
    ])

    const statusCounts = Object.fromEntries(
        getInvoiceBackfillStatuses().map((status) => [status, 0]),
    ) as Record<BookingPaymentStatus, number>
    statusRows.forEach((row) => {
        if (row.status in statusCounts) {
            statusCounts[row.status] = Number(row.count)
        }
    })

    return createPaymentInvoiceBackfillPreflight({
        candidateCount,
        oldestAgeMs: getMaintenanceBacklogAgeMs(oldestRow?.oldestCreatedAt, now.getTime()),
        statusCounts,
    })
}

export async function backfillMissingPaymentInvoices(
    assertLease?: () => void,
): Promise<PaymentInvoiceBackfillResult> {
    const paymentRepository = AppDataSource.getRepository(BookingPaymentEntity)
    const [payments, candidateCount] = await paymentRepository
        .createQueryBuilder('payment')
        .leftJoin(
            BookingPaymentInvoiceEntity,
            'invoice',
            'invoice.paymentId = payment.id',
        )
        .where('payment.status IN (:...statuses)', {
            statuses: getInvoiceBackfillStatuses(),
        })
        .andWhere('invoice.id IS NULL')
        .orderBy('payment.createdAt', 'ASC')
        .take(getMaintenanceDeleteBatchSize())
        .getManyAndCount()

    metrics.setGauge('payment_invoice_backfill_backlog', candidateCount)
    metrics.setGauge(
        'payment_invoice_backfill_oldest_age_ms',
        getMaintenanceBacklogAgeMs(payments[0]?.createdAt),
    )

    const result: PaymentInvoiceBackfillResult = {
        checked: payments.length,
        created: 0,
        skipped: 0,
        errors: 0,
    }

    if (payments.length === 0) {
        metrics.setGauge('payment_invoice_backfill_last_errors', 0)
        metrics.setGauge('payment_invoice_backfill_last_run_at_ms', Date.now())
        return result
    }

    await AppDataSource.transaction(async (manager) => {
        const invoiceRepository = manager.getRepository(BookingPaymentInvoiceEntity)
        for (const payment of payments) {
            assertLease?.()
            const insertResult = await invoiceRepository
                .createQueryBuilder()
                .insert()
                .into(BookingPaymentInvoiceEntity)
                .values(toPaymentInvoiceBackfillRecord(payment))
                .orIgnore()
                .returning('id')
                .execute()

            if (Array.isArray(insertResult.raw) && insertResult.raw.length > 0) {
                result.created += 1
            } else {
                result.skipped += 1
            }
        }
    })

    for (const [outcome, count] of Object.entries(result)) {
        metrics.increment('payment_invoice_backfill_outcomes_total', count, { outcome })
    }
    metrics.setGauge('payment_invoice_backfill_last_errors', result.errors)
    metrics.setGauge('payment_invoice_backfill_last_run_at_ms', Date.now())
    return result
}
