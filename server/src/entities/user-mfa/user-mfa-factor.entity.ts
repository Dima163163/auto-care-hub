import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'

import { UserEntity } from '../user/user.entity.js'

@Entity('user_mfa_factors')
export class UserMfaFactorEntity {
    @PrimaryColumn({ type: 'uuid', name: 'user_id' })
    userId!: string

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: UserEntity

    @Column({ type: 'text', name: 'secret_ciphertext' })
    secretCiphertext!: string

    @Column({ type: 'integer', name: 'last_accepted_counter', default: -1 })
    lastAcceptedCounter!: number

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date
}
