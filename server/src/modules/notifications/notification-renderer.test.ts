import { describe, expect, it } from 'vitest'

import {
    readNotificationTemplateMetadata,
    renderNotificationTemplate,
} from './notification-renderer.js'

describe('notification renderer', () => {
    it('renders the same template key in supported locales', () => {
        const english = renderNotificationTemplate(
            'security.refresh_token_reuse',
            {},
            'en',
        )
        const russian = renderNotificationTemplate(
            'security.refresh_token_reuse',
            {},
            'ru',
        )
        const romanian = renderNotificationTemplate(
            'security.refresh_token_reuse',
            {},
            'ro',
        )

        expect(english.link).toBe('/profile/security')
        expect(english.title).toBe('Security alert')
        expect(russian.title).toBe('Предупреждение безопасности')
        expect(romanian.title).toBe('Alertă de securitate')
        expect(russian.message).not.toBe(english.message)
    })

    it('interpolates bounded template parameters', () => {
        const rendered = renderNotificationTemplate(
            'booking.confirmed.client',
            {
                cabinetTitle: 'Focus room',
                date: '2026-08-01',
                startTime: '10:00',
                serviceTitle: 'Portrait session',
            },
            'en',
        )

        expect(rendered.message).toContain('Focus room')
        expect(rendered.message).toContain('2026-08-01')
    })

    it('reads only valid template metadata parameters', () => {
        const template = readNotificationTemplateMetadata({
            templateKey: 'booking.reminder',
            templateParams: {
                cabinetTitle: 'Focus room',
                date: '2026-08-01',
                startTime: '10:00',
                ignored: { nested: true },
            },
        })

        expect(template).toEqual({
            key: 'booking.reminder',
            params: {
                cabinetTitle: 'Focus room',
                date: '2026-08-01',
                startTime: '10:00',
            },
        })
        expect(readNotificationTemplateMetadata({ templateKey: 'unknown' })).toBeNull()
    })
})
