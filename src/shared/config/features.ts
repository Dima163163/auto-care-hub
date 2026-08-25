import { readPublicEnv } from './runtime-env'

/**
 * Product-surface switches. Keep disabled MVP surfaces in the codebase so
 * they can be enabled after the free launch without restoring deleted UI.
 */
export const FEATURE_FLAGS = {
    providerPricing: readPublicEnv('VITE_ENABLE_PROVIDER_PRICING') === 'true',
    // Chat is a supported product surface. It can be hidden deliberately for
    // a constrained rollout with VITE_ENABLE_CHAT_NAVIGATION=false.
    chatsNavigation: readPublicEnv('VITE_ENABLE_CHAT_NAVIGATION') !== 'false',
} as const

export const isProviderPricingVisible = FEATURE_FLAGS.providerPricing
export const isChatNavigationVisible = FEATURE_FLAGS.chatsNavigation
