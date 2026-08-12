type StripeConfigInput = {
    secretKey?: string
    webhookSecret?: string
}

const PLACEHOLDER_VALUES = new Set([
    'sk_test_mock',
    'whsec_mock',
    'sk_test_replace_me',
    'whsec_replace_me',
])

function normalize(value: string | undefined) {
    const normalized = value?.trim()

    return normalized || null
}

function assertConfiguredProductionValue(name: string, value: string | null) {
    if (!value) {
        throw new Error(`${name} is required in production.`)
    }

    if (PLACEHOLDER_VALUES.has(value)) {
        throw new Error(`${name} must not use a placeholder value in production.`)
    }
}

export function getStripeConfig(nodeEnv: 'development' | 'test' | 'production', input: StripeConfigInput = {}) {
    const secretKey = normalize(input.secretKey)
    const webhookSecret = normalize(input.webhookSecret)

    if (nodeEnv === 'production') {
        assertConfiguredProductionValue('STRIPE_SECRET_KEY', secretKey)
        assertConfiguredProductionValue('STRIPE_WEBHOOK_SECRET', webhookSecret)
    }

    return {
        secretKey: secretKey ?? 'sk_test_mock',
        webhookSecret: webhookSecret ?? 'whsec_mock',
    }
}
