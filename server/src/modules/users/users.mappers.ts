import type { UserEntity } from '../../entities/user/user.entity.js'
import type { OwnerClient } from './users.types.js'

export function toOwnerClient(user: UserEntity): OwnerClient {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
    }
}