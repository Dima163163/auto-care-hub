import { readPublicEnv } from './runtime-env'

/**
 * Product-surface switches. Keep disabled MVP surfaces in the codebase so
 * they can be enabled after the free launch without restoring deleted UI.
 */
export const FEATURE_FLAGS = {
    providerPricing: readPublicEnv('VITE_ENABLE_PROVIDER_PRICING') === 'true',
    // Chat routes and API stay available for development while the MVP keeps chat navigation hidden.
    chatsNavigation: readPublicEnv('VITE_ENABLE_CHAT_NAVIGATION') === 'true',
} as const

export const isProviderPricingVisible = FEATURE_FLAGS.providerPricing
export const isChatNavigationVisible = FEATURE_FLAGS.chatsNavigation
