import { readPublicEnv } from './runtime-env'

/**
 * Product-surface switches. Keep rollout controls in the codebase so a
 * surface can be enabled by default and rolled back without deleting its UI.
 */
export const FEATURE_FLAGS = {
    // Chat is a supported product surface. It can be hidden deliberately for
    // a constrained rollout with VITE_ENABLE_CHAT_NAVIGATION=false.
    chatsNavigation: readPublicEnv('VITE_ENABLE_CHAT_NAVIGATION') !== 'false',
} as const

export const isChatNavigationVisible = FEATURE_FLAGS.chatsNavigation
