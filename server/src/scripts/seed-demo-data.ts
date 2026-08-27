import { hash } from 'bcryptjs'

import { AppDataSource } from '../database/data-source.js'
import {
    UserEntity,
    UserProvider,
    UserRole,
    UserStatus,
} from '../entities/user/user.entity.js'
import { DEMO_PASSWORD, DEMO_USERS } from './demo-fixtures.js'

type DemoUserInput = {
    name: string
    email: string
    role: UserRole
}

async function upsertDemoUser(input: DemoUserInput, passwordHash: string) {
    const repository = AppDataSource.getRepository(UserEntity)
    const existing = await repository.findOneBy({ email: input.email })

    return repository.save(repository.create({
        ...existing,
        name: input.name,
        email: input.email,
        passwordHash,
        phone: null,
        role: input.role,
        status: UserStatus.Active,
        avatarUrl: null,
        provider: UserProvider.Email,
        emailVerifiedAt: existing?.emailVerifiedAt ?? new Date(),
        emailNotifications: true,
        bookingEmailNotifications: true,
    }))
}

/**
 * Seeds only the identities required by the active AutoCare fixtures.
 * Automotive providers, locations, offers and requests are seeded separately
 * by `autocare:seed`; this script intentionally creates no legacy cabinets,
 * wellness services or legacy bookings.
 */
async function seedDemoUsers() {
    await AppDataSource.initialize()

    try {
        const passwordHash = await hash(DEMO_PASSWORD, 10)
        await Promise.all([
            upsertDemoUser({ name: DEMO_USERS.client.name, email: DEMO_USERS.client.email, role: UserRole.Client }, passwordHash),
            upsertDemoUser({ name: DEMO_USERS.owner.name, email: DEMO_USERS.owner.email, role: UserRole.Owner }, passwordHash),
            upsertDemoUser({ name: DEMO_USERS.staff.name, email: DEMO_USERS.staff.email, role: UserRole.Owner }, passwordHash),
            upsertDemoUser({ name: DEMO_USERS.admin.name, email: DEMO_USERS.admin.email, role: UserRole.Admin }, passwordHash),
            upsertDemoUser({ name: DEMO_USERS.superAdmin.name, email: DEMO_USERS.superAdmin.email, role: UserRole.SuperAdmin }, passwordHash),
        ])

        console.info('AutoCare demo users seeded successfully.')
        console.info(`Demo password for all seeded users: ${DEMO_PASSWORD}`)
    } finally {
        await AppDataSource.destroy()
    }
}

seedDemoUsers().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
})
