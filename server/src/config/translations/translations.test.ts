import { describe, expect, it } from 'vitest'

import { SUPPORTED_LOCALES } from '../i18n.js'
import { translations } from './index.js'
import { t } from '../../shared/i18n/i18n.js'

describe('server translation registry', () => {
    it('keeps every supported locale compatible with the English schema', () => {
        expect(Object.keys(translations).sort()).toEqual([...SUPPORTED_LOCALES].sort())

        for (const locale of SUPPORTED_LOCALES) {
            expect(t('common.loading', undefined, locale)).toEqual(expect.any(String))
        }
    })

    it('localizes auth emails and security notifications for the expanded locales', () => {
        for (const locale of SUPPORTED_LOCALES.slice(3)) {
            expect(t('emails.passwordReset.title', undefined, locale)).not.toBe('Reset your password')
            expect(t('notifications.security.refreshTokenReuse.title', undefined, locale)).not.toBe('Security alert')
        }
    })

    it('localizes booking lifecycle email bodies for every non-English locale', () => {
        for (const locale of SUPPORTED_LOCALES.slice(2)) {
            expect(t('emails.booking.title.confirmed', undefined, locale)).not.toBe('Booking Confirmed')
            expect(t('emails.booking.description.created', undefined, locale)).not.toBe(
                'Your booking request has been sent to the cabinet owner and is pending confirmation.',
            )
            expect(t('emails.booking.details.time', undefined, locale)).not.toBe('Time:')
        }
    })
})
