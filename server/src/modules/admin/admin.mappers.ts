import type { CabinetEntity } from '../../entities/cabinet/cabinet.entity.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import type { AdminCabinet, AdminUser } from './admin.types.js'

export function toAdminUser(user: UserEntity): AdminUser {
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
        createdAt: user.createdAt,
    }
}

export function toAdminCabinet(cabinet: CabinetEntity): AdminCabinet {
    return {
        id: cabinet.id,
        ownerId: cabinet.ownerId,
        title: cabinet.title,
        description: cabinet.description,
        address: cabinet.address,
        city: cabinet.city,
        pricePerHour: cabinet.pricePerHour,
        status: cabinet.status,
        photos: cabinet.photos,
        createdAt: cabinet.createdAt,
        owner: {
            id: cabinet.owner.id,
            name: cabinet.owner.name,
            email: cabinet.owner.email,
        },
    }
}
