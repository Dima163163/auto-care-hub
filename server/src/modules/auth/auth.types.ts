import type { UserRole } from '../../entities/user/user.entity.js'

export type AccessTokenPayload = {
    userId: string
    role: UserRole
    tokenVersion: number
    sessionId?: string
    tokenType: 'access'
}

export type RefreshTokenPayload = {
    userId: string
    role: UserRole
    tokenVersion: number
    sessionId?: string
    tokenType: 'refresh'
}