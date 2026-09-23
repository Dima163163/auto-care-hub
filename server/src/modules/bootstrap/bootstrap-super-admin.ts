import { AppDataSource } from '../../database/data-source.js'
import {
    UserEntity,
    UserProvider,
    UserRole,
    UserStatus,
} from '../../entities/user/user.entity.js'
import { createPasswordSetupTokenForUser } from '../auth/auth.service.js'

type BootstrapSuperAdminInput = {
    email: string | null
    name: string
}

function normalizeEmail(email: string) {
    return email.trim().toLowerCase()
}

export async function bootstrapSuperAdmin(input: BootstrapSuperAdminInput) {
    if (!input.email) {
        return {
            action: 'skipped',
        } as const
    }

    const email = normalizeEmail(input.email)

    return AppDataSource.transaction(async (manager) => {
        // The bootstrap runs in both API and worker processes. Serialize the
        // normalized target email before checking it so replicas cannot race
        // through the absent-user path and compete to create the same account.
        await manager.query(
            'SELECT pg_advisory_xact_lock(hashtext($1))',
            [`bootstrap-super-admin:${email}`],
        )

        const userRepository = manager.getRepository(UserEntity)
        const existingUser = await userRepository.findOne({ where: { email } })

        if (existingUser) {
            // A configured address is not proof that an existing account is
            // controlled by the operator. Never promote an unverified account
            // or turn a blocked account back on during process startup.
            if (
                !existingUser.emailVerifiedAt
                || existingUser.status === UserStatus.Blocked
            ) {
                return { action: 'skipped' } as const
            }

            if (
                existingUser.role === UserRole.SuperAdmin
                && existingUser.passwordHash
            ) {
                return { action: 'skipped' } as const
            }

            existingUser.role = UserRole.SuperAdmin
            const savedUser = await userRepository.save(existingUser)
            const passwordSetupToken = savedUser.passwordHash
                ? null
                : await createPasswordSetupTokenForUser(savedUser, manager)

            return {
                action: 'promoted',
                email,
                passwordSetupToken,
            } as const
        }

        const superAdmin = userRepository.create({
            name: input.name,
            email,
            passwordHash: null,
            phone: null,
            role: UserRole.SuperAdmin,
            status: UserStatus.Active,
            avatarUrl: null,
            provider: UserProvider.Email,
            emailVerifiedAt: null,
        })

        const savedSuperAdmin = await userRepository.save(superAdmin)
        const passwordSetupToken = await createPasswordSetupTokenForUser(
            savedSuperAdmin,
            manager,
        )

        return {
            action: 'created',
            email,
            passwordSetupToken,
        } as const
    })
}
