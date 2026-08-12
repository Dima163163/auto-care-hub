import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm'
import type { SupportedLocale } from '../../config/i18n.js'

export enum UserRole {
    Client = 'client',
    Owner = 'owner',
    Admin = 'admin',
    SuperAdmin = 'super_admin',
}

export enum UserStatus {
    Active = 'active',
    Blocked = 'blocked',
}

export enum UserProvider {
    Email = 'email',
    Google = 'google',
    Yandex = 'yandex',
}

@Entity('users')
@Index('IDX_users_created_at_id', ['createdAt', 'id'])
@Index('IDX_users_role_status_created_at', ['role', 'status', 'createdAt', 'id'])
@Check(
    'CHK_users_input_bounds',
    'char_length("name") BETWEEN 2 AND 120 AND char_length("email") BETWEEN 3 AND 320 AND ("phone" IS NULL OR char_length("phone") <= 32) AND ("avatarUrl" IS NULL OR char_length("avatarUrl") <= 2048) AND ("preferredCity" IS NULL OR char_length("preferredCity") <= 120) AND cardinality("preferredCategories") <= 12',
)
@Check(
    'CHK_users_locale_supported',
    '"locale" IS NULL OR "locale" IN (\'en\', \'ru\', \'ro\', \'es\', \'de\', \'fr\', \'pt\', \'zh\', \'ja\', \'ko\', \'ar\', \'tr\', \'hi\')',
)
export class UserEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'text' })
    name!: string

    @Column({ type: 'text', unique: true })
    email!: string

    @Column({ type: 'text', nullable: true })
    passwordHash!: string | null

    @Column({ type: 'text', nullable: true })
    phone!: string | null

    @Column({
        type: 'enum',
        enum: UserRole,
        enumName: 'user_role',
    })
    role!: UserRole

    @Column({
        type: 'enum',
        enum: UserStatus,
        enumName: 'user_status',
        default: UserStatus.Active,
    })
    status!: UserStatus

    @Column({ type: 'text', nullable: true })
    avatarUrl!: string | null

    @Column({ type: 'text', nullable: true })
    locale!: SupportedLocale | null

    @Column({ type: 'text', nullable: true, unique: true })
    stripeConnectAccountId!: string | null

    @Column({
        type: 'enum',
        enum: UserProvider,
        enumName: 'user_provider',
        default: UserProvider.Email,
    })
    provider!: UserProvider

    @Column({ type: 'integer', default: 1 })
    tokenVersion!: number

    @Column({ type: 'integer', default: 0 })
    failedLoginAttempts!: number

    @Column({ type: 'timestamptz', nullable: true })
    lockedUntil!: Date | null

    @Column({ type: 'timestamptz', nullable: true })
    lastFailedLoginAt!: Date | null

    @Column({ type: 'timestamptz', nullable: true })
    emailVerifiedAt!: Date | null

    @Column({ type: 'boolean', default: true })
    emailNotifications!: boolean

    @Column({ type: 'boolean', default: true })
    bookingEmailNotifications!: boolean

    @Column({ type: 'text', nullable: true })
    preferredCity!: string | null

    @Column({ type: 'text', array: true, default: () => "'{}'" })
    preferredCategories!: string[]

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date
}
