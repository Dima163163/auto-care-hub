import type { FastifyRequest } from 'fastify'

import type { UserEntity } from '../../entities/user/user.entity.js'
import { isAdminRole } from '../../shared/auth/roles.js'
import { requireRecentPrivilegedMfa } from '../auth/privileged-step-up.service.js'

/** Require fresh MFA before an administrator receives private chat content. */
export async function requireExceptionalChatReadStepUp(request: FastifyRequest, user: UserEntity) {
    if (isAdminRole(user.role)) await requireRecentPrivilegedMfa(request)
}
