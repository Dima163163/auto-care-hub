import { describe, expect, it } from 'vitest'

import { isNotificationTemplateKey } from './notification-templates.js'

describe('notification template contract', () => {
    it('accepts registered security templates only', () => {
        expect(isNotificationTemplateKey('security.refresh_token_reuse')).toBe(true)
        expect(isNotificationTemplateKey('security.unknown')).toBe(false)
        expect(isNotificationTemplateKey(undefined)).toBe(false)
    })
})
