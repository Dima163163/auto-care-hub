import Stripe from 'stripe'
import { In } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import { CabinetScheduleEntity } from '../../entities/cabinet/cabinet-schedule.entity.js'
import { CabinetEntity, CabinetStatus } from '../../entities/cabinet/cabinet.entity.js'
import { ServiceEntity } from '../../entities/service/service.entity.js'
import { stripe } from '../../shared/stripe/stripe.js'
import { getPayoutCapabilityDecision } from './payout-capability.js'
import { env } from '../../config/env.js'

export type OwnerPayoutReadiness = 'ready' | 'not_connected' | 'pending' | 'unavailable'

export type OwnerReadiness = {
    ready: boolean
    blockers: Array<'email_verification' | 'active_cabinet' | 'active_service' | 'schedule' | 'payout_account'>
    checks: {
        emailVerified: boolean
        activeCabinet: boolean
        activeService: boolean
        scheduleConfigured: boolean
        payoutAccount: OwnerPayoutReadiness
    }
}

type OwnerReadinessSource = {
    id: string
    emailVerifiedAt: Date | null
    stripeConnectAccountId: string | null
}

export async function getOwnerReadiness(
    owner: OwnerReadinessSource,
    stripeClient: Pick<Stripe, 'accounts'> = stripe,
): Promise<OwnerReadiness> {
    const ownedCabinets = await AppDataSource.getRepository(CabinetEntity).find({
        where: {
            ownerId: owner.id,
            status: In([CabinetStatus.Active]),
        },
        select: { id: true },
    })
    const activeCabinetIds = ownedCabinets.map((cabinet) => cabinet.id)
    const activeCabinet = activeCabinetIds.length > 0

    const [activeServiceCount, openScheduleCount] = activeCabinet
        ? await Promise.all([
            AppDataSource.getRepository(ServiceEntity).count({
                where: { cabinetId: In(activeCabinetIds), isActive: true },
            }),
            AppDataSource.getRepository(CabinetScheduleEntity).count({
                where: { cabinetId: In(activeCabinetIds), isOpen: true },
            }),
        ])
        : [0, 0]

    // Customer repair payment and provider payouts are intentionally not part
    // of the free AutoCare launch.  Keep the legacy read model available for
    // compatibility, but never make a disabled Stripe payout a blocker or
    // call the provider API from the normal owner dashboard.
    let payoutAccount: OwnerPayoutReadiness = env.paymentsEnabled ? 'not_connected' : 'unavailable'
    if (env.paymentsEnabled && owner.stripeConnectAccountId) {
        try {
            const account = await stripeClient.accounts.retrieve(owner.stripeConnectAccountId)
            const capability = getPayoutCapabilityDecision({
                chargesEnabled: Boolean(account.charges_enabled),
                payoutsEnabled: Boolean(account.payouts_enabled),
                detailsSubmitted: Boolean(account.details_submitted),
            })
            payoutAccount = capability === 'enabled' ? 'ready' : 'pending'
        } catch {
            payoutAccount = 'unavailable'
        }
    }

    const checks = {
        emailVerified: owner.emailVerifiedAt !== null,
        activeCabinet,
        activeService: activeServiceCount > 0,
        scheduleConfigured: openScheduleCount > 0,
        payoutAccount,
    }
    const blockers: OwnerReadiness['blockers'] = []

    if (!checks.emailVerified) blockers.push('email_verification')
    if (!checks.activeCabinet) blockers.push('active_cabinet')
    if (!checks.activeService) blockers.push('active_service')
    if (!checks.scheduleConfigured) blockers.push('schedule')
    if (env.paymentsEnabled && checks.payoutAccount !== 'ready') blockers.push('payout_account')

    return {
        ready: blockers.length === 0,
        blockers,
        checks,
    }
}
