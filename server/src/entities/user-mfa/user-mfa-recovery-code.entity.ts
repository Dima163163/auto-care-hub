import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

import { UserEntity } from '../user/user.entity.js'

@Entity('user_mfa_recovery_codes')
@Index('UQ_user_mfa_recovery_code_hash', ['userId', 'codeHash'], { unique: true })
export class UserMfaRecoveryCodeEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'uuid', name: 'user_id' })
    userId!: string

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: UserEntity

    @Column({ type: 'text', name: 'code_hash' })
    codeHash!: string

    @Column({ type: 'timestamptz', name: 'consumed_at', nullable: true })
    consumedAt!: Date | null

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date
}
