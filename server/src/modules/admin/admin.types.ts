import type { CabinetStatus } from '../../entities/cabinet/cabinet.entity.js'
import type { BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import type { BookingPaymentRefundStatus } from '../../entities/booking/booking-payment-refund.entity.js'
import type { BookingPaymentDisputeStatus } from '../../entities/booking/booking-payment-dispute.entity.js'
import type {
    UserProvider,
    UserRole,
    UserStatus,
} from '../../entities/user/user.entity.js'
import type { SupportedLocale } from '../../config/i18n.js'

export type AdminUser = {
    id: string
    name: string
    email: string
    phone: string | null
    role: UserRole
    status: UserStatus
    avatarUrl: string | null
    locale: SupportedLocale | null
    provider: UserProvider
    emailVerifiedAt: Date | null
    createdAt: Date
}

export type AdminCabinetOwner = {
    id: string
    name: string
    email: string
}

export type AdminCabinet = {
    id: string
    ownerId: string
    title: string
    description: string
    address: string
    city: string
    pricePerHour: number
    status: CabinetStatus
    photos: string[]
    createdAt: Date
    owner: AdminCabinetOwner
}

export type CreateAdminResponse = {
    user: AdminUser
    passwordSetupToken: string
    passwordSetupExpiresAt: string
}

export type AdminPayment = {
    id: string
    bookingId: string
    client: {
        id: string
        name: string
        email: string
    }
    owner: {
        id: string
        name: string
        email: string
    }
    cabinetTitle: string
    serviceTitle: string
    date: string
    startTime: string
    endTime: string
    grossAmount: number
    refundedAmountMinor: number
    remainingAmountMinor: number
    commissionAmount: number
    ownerPayoutAmount: number
    currency: string
    status: BookingPaymentStatus
    stripeSessionId: string | null
    stripePaymentIntentId: string | null
    createdAt: Date
}

export type AdminPaymentRefund = {
    id: string
    paymentId: string
    bookingId: string
    providerRefundId: string
    providerChargeId: string | null
    amountMinor: number
    currency: string
    reason: string | null
    status: BookingPaymentRefundStatus
    createdAt: Date
    updatedAt: Date
}

export type AdminPaymentDispute = {
    id: string
    paymentId: string
    bookingId: string
    providerDisputeId: string
    providerChargeId: string | null
    amountMinor: number
    currency: string
    reason: string
    providerStatus: string
    status: BookingPaymentDisputeStatus
    lastEventId: string
    lastEventCreatedAt: Date
    createdAt: Date
    updatedAt: Date
}
