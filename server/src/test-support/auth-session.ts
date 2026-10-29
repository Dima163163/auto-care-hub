import type { UserEntity } from '../entities/user/user.entity.js'
import { isAdminRole } from '../shared/auth/roles.js'
import { createAuthTokens } from '../modules/auth/auth.service.js'
import { getRefreshSessionExpiry } from '../modules/auth/refresh-session-lifetime.js'
import { createUserSession } from '../modules/auth/session.service.js'

/** Explicit integration fixture for routes that require a privileged session. */
export async function createTestAccessToken(user: UserEntity) {
    if (!isAdminRole(user.role)) return createAuthTokens(user).accessToken
    const session = await createUserSession({
        userId: user.id,
        expiresAt: getRefreshSessionExpiry(),
        mfaVerifiedAt: new Date(),
    })
    return createAuthTokens(user, session.id, session.expiresAt).accessToken
}
