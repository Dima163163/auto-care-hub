import type { SupportedLocale } from '../../config/i18n.js'
import { t, type TranslationKey } from '../../shared/i18n/i18n.js'
import {
    isNotificationTemplateKey,
    type NotificationTemplateKey,
} from './notification-templates.js'

type RenderedNotification = {
    title: string
    message: string
    link: string
}

export type NotificationTemplateParams = Record<string, string | number>

type NotificationTemplateDefinition = {
    titleKey: TranslationKey
    messageKey: TranslationKey
    link: string
}

const TEMPLATE_DEFINITIONS: Record<NotificationTemplateKey, NotificationTemplateDefinition> = {
    'security.account_locked': {
        titleKey: 'notifications.security.accountLocked.title',
        messageKey: 'notifications.security.accountLocked.message',
        link: '/profile/security',
    },
    'security.refresh_token_reuse': {
        titleKey: 'notifications.security.refreshTokenReuse.title',
        messageKey: 'notifications.security.refreshTokenReuse.message',
        link: '/profile/security',
    },
    'security.account_deletion_requested': {
        titleKey: 'notifications.security.accountDeletionRequested.title',
        messageKey: 'notifications.security.accountDeletionRequested.message',
        link: '/profile/security',
    },
    'booking.created.owner': {
        titleKey: 'notifications.booking.createdOwner.title',
        messageKey: 'notifications.booking.createdOwner.message',
        link: '/owner/bookings',
    },
    'booking.created.client': {
        titleKey: 'notifications.booking.createdClient.title',
        messageKey: 'notifications.booking.createdClient.message',
        link: '/profile/bookings',
    },
    'booking.confirmed.client': {
        titleKey: 'notifications.booking.confirmedClient.title',
        messageKey: 'notifications.booking.confirmedClient.message',
        link: '/profile/bookings',
    },
    'booking.cancelled.owner': {
        titleKey: 'notifications.booking.cancelledOwner.title',
        messageKey: 'notifications.booking.cancelledOwner.message',
        link: '/owner/bookings',
    },
    'booking.cancelled.client': {
        titleKey: 'notifications.booking.cancelledClient.title',
        messageKey: 'notifications.booking.cancelledClient.message',
        link: '/profile/bookings',
    },
    'booking.status.pending': {
        titleKey: 'notifications.booking.status.title',
        messageKey: 'notifications.booking.status.pending',
        link: '/profile/bookings',
    },
    'booking.status.confirmed': {
        titleKey: 'notifications.booking.status.title',
        messageKey: 'notifications.booking.status.confirmed',
        link: '/profile/bookings',
    },
    'booking.status.cancelled': {
        titleKey: 'notifications.booking.status.title',
        messageKey: 'notifications.booking.status.cancelled',
        link: '/profile/bookings',
    },
    'booking.status.completed': {
        titleKey: 'notifications.booking.status.title',
        messageKey: 'notifications.booking.status.completed',
        link: '/profile/bookings',
    },
    'booking.reschedule.requested.owner': {
        titleKey: 'notifications.booking.rescheduleRequestedOwner.title',
        messageKey: 'notifications.booking.rescheduleRequestedOwner.message',
        link: '/owner/bookings',
    },
    'booking.reschedule.requested.client': {
        titleKey: 'notifications.booking.rescheduleRequestedClient.title',
        messageKey: 'notifications.booking.rescheduleRequestedClient.message',
        link: '/profile/bookings',
    },
    'booking.reschedule.accepted.client': {
        titleKey: 'notifications.booking.rescheduleAcceptedClient.title',
        messageKey: 'notifications.booking.rescheduleAcceptedClient.message',
        link: '/profile/bookings',
    },
    'booking.reschedule.rejected.client': {
        titleKey: 'notifications.booking.rescheduleRejectedClient.title',
        messageKey: 'notifications.booking.rescheduleRejectedClient.message',
        link: '/profile/bookings',
    },
    'booking.reschedule.accepted.owner': {
        titleKey: 'notifications.booking.rescheduleAcceptedOwner.title',
        messageKey: 'notifications.booking.rescheduleAcceptedOwner.message',
        link: '/owner/bookings',
    },
    'booking.reschedule.rejected.owner': {
        titleKey: 'notifications.booking.rescheduleRejectedOwner.title',
        messageKey: 'notifications.booking.rescheduleRejectedOwner.message',
        link: '/owner/bookings',
    },
    'booking.reminder': {
        titleKey: 'notifications.booking.reminder.title',
        messageKey: 'notifications.booking.reminder.message',
        link: '/profile/bookings',
    },
    'autocare.visit_reminder': {
        titleKey: 'notifications.autocare.visitReminder.title',
        messageKey: 'notifications.autocare.visitReminder.message',
        link: '/profile/bookings',
    },
    'moderation.review_updated': {
        titleKey: 'notifications.moderation.reviewUpdated.title',
        messageKey: 'notifications.moderation.reviewUpdated.message',
        link: '/profile/reviews',
    },
    'moderation.appeal_decided': {
        titleKey: 'notifications.moderation.appealDecided.title',
        messageKey: 'notifications.moderation.appealDecided.message',
        link: '/profile/reviews',
    },
}

export function renderNotificationTemplate(
    key: NotificationTemplateKey,
    params: NotificationTemplateParams = {},
    locale: SupportedLocale = 'en',
): RenderedNotification {
    const definition = TEMPLATE_DEFINITIONS[key]

    return {
        title: t(definition.titleKey, params, locale),
        message: t(definition.messageKey, params, locale),
        link: definition.link,
    }
}

export function readNotificationTemplateMetadata(metadata: Record<string, unknown>) {
    if (!isNotificationTemplateKey(metadata.templateKey)) {
        return null
    }

    const rawParams = metadata.templateParams
    const params: NotificationTemplateParams = {}

    if (typeof rawParams === 'object' && rawParams !== null) {
        for (const [key, value] of Object.entries(rawParams)) {
            if (
                (typeof value === 'string' && value.length <= 512)
                || (typeof value === 'number' && Number.isFinite(value))
            ) {
                params[key] = value
            }
        }
    }

    return {
        key: metadata.templateKey,
        params,
    }
}
