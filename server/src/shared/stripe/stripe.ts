import Stripe from 'stripe'
import { env } from '../../config/env.js'
import { assertStripeClientPolicy } from './stripe-client-policy.js'

let client: Stripe | null = null

/**
 * Stripe is a quarantined legacy integration.  Do not construct a client (or
 * validate credentials) while the free AutoCare deployment has payments
 * disabled.  Keeping the boundary lazy lets old payment tests and a future
 * approved subscription provider reuse the adapter without making Stripe an
 * active runtime dependency today.
 */
export function getStripeClient() {
    if (!env.paymentsEnabled) {
        throw new Error('Legacy Stripe payments are disabled for this deployment.')
    }
    if (client) return client

    assertStripeClientPolicy({
        timeoutMs: env.stripe.requestTimeoutMs,
        maxNetworkRetries: env.stripe.maxNetworkRetries,
    })
    client = new Stripe(env.stripe.secretKey, {
        apiVersion: '2026-06-24.dahlia',
        maxNetworkRetries: env.stripe.maxNetworkRetries,
        timeout: env.stripe.requestTimeoutMs,
        appInfo: {
            name: 'AutoCare Hub',
        },
    })
    return client
}

/**
 * Compatibility proxy for the isolated legacy payment module.  Property
 * access resolves the client only when a payment route is actually enabled.
 */
export const stripe = new Proxy({} as Stripe, {
    get: (_target, property, receiver) => Reflect.get(getStripeClient(), property, receiver),
})
