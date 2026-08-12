import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm'

import { UserEntity } from '../user/user.entity.js'

@Entity('user_sessions')
export class UserSessionEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'uuid', name: 'user_id' })
    userId!: string

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: UserEntity

    @Column({ type: 'text', nullable: true })
    userAgent!: string | null

    @Column({ type: 'text', nullable: true })
    ipAddress!: string | null

    @Column({ type: 'timestamptz' })
    lastActiveAt!: Date

    @Column({ type: 'timestamptz' })
    expiresAt!: Date

    @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
    revokedAt!: Date | null

    @Column({ type: 'text', name: 'revocation_reason', nullable: true })
    revocationReason!: string | null

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date
}
