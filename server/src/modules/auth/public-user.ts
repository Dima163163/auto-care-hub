import type { UserEntity } from '../../entities/user/user.entity.js'
import type { SupportedLocale } from '../../config/i18n.js'

export type PublicUser = {
    id: string
    name: string
    email: string
    phone: string | null
    role: UserEntity['role']
    status: UserEntity['status']
    avatarUrl: string | null
    locale: SupportedLocale | null
    provider: UserEntity['provider']
    emailVerifiedAt: Date | null
    emailNotifications: boolean
    bookingEmailNotifications: boolean
    preferredCity: string | null
    preferredCategories: string[]
    createdAt: Date
}

export function toPublicUser(user: UserEntity): PublicUser {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
        locale: user.locale,
        provider: user.provider,
        emailVerifiedAt: user.emailVerifiedAt,
        emailNotifications: user.emailNotifications,
        bookingEmailNotifications: user.bookingEmailNotifications,
        preferredCity: user.preferredCity,
        preferredCategories: user.preferredCategories,
        createdAt: user.createdAt,
    }
}
