import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum AutoCareAppealSubject {
    Provider = 'provider',
    Review = 'review',
    Suspension = 'suspension',
    Catalog = 'catalog',
}

export enum AutoCareAppealStatus {
    Pending = 'pending',
    Accepted = 'accepted',
    Rejected = 'rejected',
    Withdrawn = 'withdrawn',
}

@Entity('autocare_appeals')
@Index(['status', 'createdAt'])
@Index(['submittedById', 'createdAt'])
@Index(['subject', 'subjectId', 'status'])
@Index('UQ_autocare_appeals_pending_subject', ['submittedById', 'subject', 'subjectId'], { unique: true, where: '"status" = \'pending\'' })
export class AutoCareAppealEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'enum', enum: AutoCareAppealSubject, enumName: 'autocare_appeal_subject' }) subject!: AutoCareAppealSubject
    @Column({ type: 'uuid' }) subjectId!: string
    @Column({ type: 'uuid' }) submittedById!: string
    @Column({ type: 'uuid', nullable: true }) providerId!: string | null
    @Column({ type: 'text' }) reason!: string
    @Column('text', { array: true, default: () => "'{}'" }) evidenceIds!: string[]
    @Column({ type: 'enum', enum: AutoCareAppealStatus, enumName: 'autocare_appeal_status', default: AutoCareAppealStatus.Pending }) status!: AutoCareAppealStatus
    @Column({ type: 'uuid', nullable: true }) decidedById!: string | null
    @Column({ type: 'text', nullable: true }) decisionReason!: string | null
    @Column({ type: 'timestamptz', nullable: true }) decidedAt!: Date | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}
