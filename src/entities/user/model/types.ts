import type { EntityId, ISODateString } from '@/shared/types/common'
import type { SupportedLocale } from '@/shared/config/i18n'

export type UserRole = 'client' | 'owner' | 'admin' | 'super_admin'

export type UserStatus = 'active' | 'blocked'

export type AuthProvider = 'email' | 'google' | 'yandex'

export type User = {
    id: EntityId
    name: string
    email: string
    phone: string | null
    role: UserRole
    status: UserStatus
    avatarUrl: string | null
    locale: SupportedLocale | null
    provider: AuthProvider
    emailVerifiedAt: ISODateString | null
    emailNotifications: boolean
    bookingEmailNotifications: boolean
    preferredCity: string | null
    preferredCategories: string[]
    createdAt: ISODateString
}

export type OwnerClient = Pick<User, 'id' | 'name' | 'email' | 'phone'>
