import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm'

import { UserEntity } from '../user/user.entity.js'

export enum SecurityTokenPurpose {
    PasswordSetup = 'password_setup',
    PasswordReset = 'password_reset',
    EmailVerification = 'email_verification',
}

@Entity('security_tokens')
export class SecurityTokenEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Index()
    @Column({ type: 'uuid' })
    userId!: string

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: UserEntity

    @Column({
        type: 'enum',
        enum: SecurityTokenPurpose,
        enumName: 'security_token_purpose',
    })
    purpose!: SecurityTokenPurpose

    @Index({ unique: true })
    @Column({ type: 'text' })
    tokenHash!: string

    @Column({ type: 'timestamptz' })
    expiresAt!: Date

    @Column({ type: 'timestamptz', nullable: true })
    usedAt!: Date | null

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date
}
