import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm'

export enum AutoCareRescheduleStatus {
    Pending = 'pending',
    Accepted = 'accepted',
    Rejected = 'rejected',
}

@Entity('autocare_reschedule_requests')
@Index('UQ_autocare_reschedule_pending', ['requestId'], {
    unique: true,
    where: '"status" = \'pending\'',
})
export class AutoCareRescheduleRequestEntity {
    @PrimaryGeneratedColumn('uuid') id!: string

    @Column({ type: 'uuid' }) requestId!: string
    @Column({ type: 'uuid' }) requestedById!: string
    @Column({ type: 'timestamptz' }) proposedAt!: Date
    @Column({ type: 'enum', enum: AutoCareRescheduleStatus, enumName: 'autocare_reschedule_status', default: AutoCareRescheduleStatus.Pending }) status!: AutoCareRescheduleStatus
    @Column({ type: 'text', nullable: true }) reason!: string | null
    @Column({ type: 'uuid', nullable: true }) resolvedById!: string | null
    @Column({ type: 'text', nullable: true }) resolutionReason!: string | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @Column({ type: 'timestamptz', nullable: true }) resolvedAt!: Date | null
}
