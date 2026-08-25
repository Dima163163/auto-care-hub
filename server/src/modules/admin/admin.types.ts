import type { CabinetStatus } from '../../entities/cabinet/cabinet.entity.js'
import type {
    UserProvider,
    UserRole,
    UserStatus,
} from '../../entities/user/user.entity.js'
import type { SupportedLocale } from '../../config/i18n.js'

export type AdminUser = {
    id: string
    name: string
    email: string
    phone: string | null
    role: UserRole
    status: UserStatus
    avatarUrl: string | null
    locale: SupportedLocale | null
    provider: UserProvider
    emailVerifiedAt: Date | null
    createdAt: Date
}

export type AdminCabinetOwner = {
    id: string
    name: string
    email: string
}

export type AdminCabinet = {
    id: string
    ownerId: string
    title: string
    description: string
    address: string
    city: string
    pricePerHour: number
    status: CabinetStatus
    photos: string[]
    createdAt: Date
    owner: AdminCabinetOwner
}

export type CreateAdminResponse = {
    user: AdminUser
    passwordSetupToken: string
    passwordSetupExpiresAt: string
}
