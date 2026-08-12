import { AppDataSource } from '../../database/data-source.js'
import { BookingPaymentAttemptEntity } from '../../entities/booking/booking-payment-attempt.entity.js'
import { BookingPaymentEntity } from '../../entities/booking/booking-payment.entity.js'
import { BookingPaymentInvoiceEntity } from '../../entities/booking/booking-payment-invoice.entity.js'
import { BookingEntity } from '../../entities/booking/booking.entity.js'
import { UserEntity, UserRole } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { getRemainingPaymentAmountMinor } from './payment-money.js'

export type ClientBookingPaymentStatusResponse = {
    status: BookingPaymentEntity['status'] | null
    grossAmount: number | null
    refundedAmountMinor: number
    remainingAmountMinor: number | null
    currency: string | null
    createdAt: string | null
    invoice: {
        invoiceId: string
        amount: number
        currency: string
        status: 'open' | 'paid' | 'void'
        issuedAt: string
    } | null
    attempts: Array<{
        attemptNumber: number
        status: BookingPaymentAttemptEntity['status']
        createdAt: string
    }>
}

export function toClientBookingPaymentStatusResponse(
    payment: BookingPaymentEntity | null,
    attempts: BookingPaymentAttemptEntity[],
    invoice: BookingPaymentInvoiceEntity | null = null,
): ClientBookingPaymentStatusResponse {
    return {
        status: payment?.status ?? null,
        grossAmount: payment?.grossAmount ?? null,
        refundedAmountMinor: payment?.refundedAmountMinor ?? 0,
        remainingAmountMinor: payment
            ? getRemainingPaymentAmountMinor(payment.grossAmount, payment.refundedAmountMinor ?? 0)
            : null,
        currency: payment?.currency ?? null,
        createdAt: payment?.createdAt.toISOString() ?? null,
        invoice: invoice
            ? {
                invoiceId: invoice.invoiceId,
                amount: invoice.amount,
                currency: invoice.currency,
                status: invoice.status,
                issuedAt: invoice.issuedAt.toISOString(),
            }
            : null,
        attempts: attempts.map((attempt) => ({
            attemptNumber: attempt.attemptNumber,
            status: attempt.status,
            createdAt: attempt.createdAt.toISOString(),
        })),
    }
}

export async function getClientBookingPaymentStatus(
    client: UserEntity,
    bookingId: string,
) {
    if (client.role !== UserRole.Client) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only clients can view booking payment status.',
        })
    }

    const booking = await AppDataSource.getRepository(BookingEntity).findOne({
        where: { id: bookingId, clientId: client.id },
        select: { id: true },
    })

    if (!booking) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Booking not found.',
        })
    }

    const payment = await AppDataSource.getRepository(BookingPaymentEntity).findOne({
        where: { bookingId },
    })
    const attempts = payment
        ? await AppDataSource.getRepository(BookingPaymentAttemptEntity).find({
            where: { paymentId: payment.id },
            order: { attemptNumber: 'ASC' },
        })
        : []
    const invoice = payment
        ? await AppDataSource.getRepository(BookingPaymentInvoiceEntity).findOne({
            where: { paymentId: payment.id },
        })
        : null

    return toClientBookingPaymentStatusResponse(payment, attempts, invoice)
}
