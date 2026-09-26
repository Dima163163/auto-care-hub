import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm'
import type { SupportedLocale } from '../../config/i18n.js'
import { createEncryptedFieldTransformer, emailBlindIndexTransformer } from '../../shared/security/data-encryption/field-encryption.js'

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
@Index('UQ_users_community_profile_id', ['communityProfileId'], { unique: true })
@Index('IDX_users_created_at_id', ['createdAt', 'id'])
@Index('IDX_users_role_status_created_at', ['role', 'status', 'createdAt', 'id'])
@Check(
    'CHK_users_locale_supported',
    '"locale" IS NULL OR "locale" IN (\'en\', \'ru\', \'ro\', \'es\', \'de\', \'fr\', \'pt\', \'it\', \'pl\', \'nl\', \'uk\', \'cs\', \'el\', \'sv\', \'zh\', \'ja\', \'ko\', \'ar\', \'tr\', \'hi\')',
)
export class UserEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'text', transformer: createEncryptedFieldTransformer('users', 'name', 'text') })
    name!: string

    @Column({ type: 'text', unique: true, transformer: emailBlindIndexTransformer })
    email!: string

    /** Ciphertext paired with the unique HMAC lookup index stored in `email`. */
    @Column({ type: 'text' })
    emailCiphertext!: string

    @Column({ type: 'text', nullable: true })
    passwordHash!: string | null

    @Column({ type: 'text', nullable: true, transformer: createEncryptedFieldTransformer('users', 'phone', 'text') })
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

    @Column({ type: 'text', nullable: true, transformer: createEncryptedFieldTransformer('users', 'avatarUrl', 'text') })
    avatarUrl!: string | null

    /** Opaque public identifier, rotated whenever the client re-enables sharing. */
    @Column({ type: 'uuid', default: () => 'gen_random_uuid()' })
    communityProfileId!: string

    @Column({ type: 'boolean', default: false })
    communityProfileEnabled!: boolean

    @Column({ type: 'text', nullable: true, transformer: createEncryptedFieldTransformer('users', 'communityDisplayName', 'text') })
    communityDisplayName!: string | null

    @Column({ type: 'text', nullable: true })
    locale!: SupportedLocale | null

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

    @Column({ type: 'text', nullable: true, transformer: createEncryptedFieldTransformer('users', 'preferredCity', 'text') })
    preferredCity!: string | null

    @Column({ type: 'text', array: true, default: () => "'{}'" })
    preferredCategories!: string[]

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date
}
