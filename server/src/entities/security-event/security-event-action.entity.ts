import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm'

import { SecurityEventEntity } from './security-event.entity.js'
import { UserEntity } from '../user/user.entity.js'

export enum SecurityEventActionStatus {
    Acknowledged = 'acknowledged',
    Investigating = 'investigating',
    Resolved = 'resolved',
    Suppressed = 'suppressed',
}

@Entity('security_event_actions')
@Index('IDX_security_event_actions_event_created_at', ['securityEventId', 'createdAt', 'id'])
export class SecurityEventActionEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ name: 'security_event_id', type: 'uuid' })
    securityEventId!: string

    @ManyToOne(() => SecurityEventEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'security_event_id' })
    securityEvent!: SecurityEventEntity

    @Column({ name: 'actor_id', type: 'uuid' })
    actorId!: string

    @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'actor_id' })
    actor!: UserEntity

    @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
    assigneeId!: string | null

    @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'assignee_id' })
    assignee!: UserEntity | null

    @Column({ type: 'text' })
    status!: SecurityEventActionStatus

    @Column({ name: 'operator_note', type: 'text', nullable: true })
    operatorNote!: string | null

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date
}
