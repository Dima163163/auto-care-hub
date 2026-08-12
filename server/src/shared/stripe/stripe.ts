import Stripe from 'stripe'
import { env } from '../../config/env.js'
import { assertStripeClientPolicy } from './stripe-client-policy.js'

assertStripeClientPolicy({
    timeoutMs: env.stripe.requestTimeoutMs,
    maxNetworkRetries: env.stripe.maxNetworkRetries,
})

export const stripe = new Stripe(env.stripe.secretKey, {
    apiVersion: '2026-06-24.dahlia',
    maxNetworkRetries: env.stripe.maxNetworkRetries,
    timeout: env.stripe.requestTimeoutMs,
    appInfo: {
        name: 'AutoCare Hub',
    },
})
