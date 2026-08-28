import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    type Relation,
} from 'typeorm'

import { UserEntity } from '../user/user.entity.js'

export enum NotificationCategory {
    Booking = 'booking',
    Moderation = 'moderation',
    Account = 'account',
    Security = 'security',
}

@Entity('notifications')
@Index(['userId', 'createdAt'])
@Index(['userId', 'readAt'])
export class NotificationEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'uuid' })
    userId!: string

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: Relation<UserEntity>

    @Column({
        type: 'enum',
        enum: NotificationCategory,
        enumName: 'notification_category',
    })
    category!: NotificationCategory

    @Column({ type: 'text' })
    title!: string

    @Column({ type: 'text' })
    message!: string

    @Column({ type: 'text', nullable: true })
    link!: string | null

    @Column({ type: 'jsonb', default: {} })
    metadata!: Record<string, unknown>

    @Column({ type: 'timestamptz', nullable: true })
    readAt!: Date | null

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date
}
