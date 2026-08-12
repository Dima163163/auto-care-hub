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

    const userRepository = AppDataSource.getRepository(UserEntity)
    const email = normalizeEmail(input.email)
    const existingUser = await userRepository.findOne({
        where: {
            email,
        },
    })

    if (existingUser) {
        const shouldCreatePasswordSetupToken = !existingUser.passwordHash

        existingUser.role = UserRole.SuperAdmin
        existingUser.status = UserStatus.Active

        const savedUser = await userRepository.save(existingUser)
        const passwordSetupToken = shouldCreatePasswordSetupToken
            ? await createPasswordSetupTokenForUser(savedUser)
            : null

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
    const passwordSetupToken =
        await createPasswordSetupTokenForUser(savedSuperAdmin)

    return {
        action: 'created',
        email,
        passwordSetupToken,
    } as const
}
