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

export enum AccountDeletionRequestStatus {
    Pending = 'pending',
    Cancelled = 'cancelled',
    Completed = 'completed',
}

@Entity('account_deletion_requests')
@Index('IDX_account_deletion_requests_user_status', ['userId', 'status'])
@Index('UQ_account_deletion_requests_pending_user', ['userId'], {
    unique: true,
    where: '"status" = \'pending\'',
})
export class AccountDeletionRequestEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'uuid', name: 'user_id' })
    userId!: string

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: UserEntity

    @Column({
        type: 'enum',
        enum: AccountDeletionRequestStatus,
        enumName: 'account_deletion_request_status',
    })
    status!: AccountDeletionRequestStatus

    @Column({ type: 'text', nullable: true })
    reason!: string | null

    @Column({ type: 'timestamptz', name: 'cancelled_at', nullable: true })
    cancelledAt!: Date | null

    @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
    completedAt!: Date | null

    @CreateDateColumn({ type: 'timestamptz', name: 'requested_at' })
    requestedAt!: Date
}
