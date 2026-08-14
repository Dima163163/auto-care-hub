import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'

export enum PlatformReviewStatus {
    Pending = 'pending',
    Approved = 'approved',
    Rejected = 'rejected',
    Removed = 'removed',
}

@Entity('platform_reviews')
@Index(['status', 'createdAt'])
export class PlatformReviewEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid', nullable: true }) clientId!: string | null
    @Column({ type: 'text' }) authorName!: string
    @Column({ type: 'text', nullable: true }) avatarUrl!: string | null
    @Column({ type: 'text' }) authorRole!: string
    @Column({ type: 'integer' }) rating!: number
    @Column({ type: 'text' }) text!: string
    @Column({ type: 'enum', enum: PlatformReviewStatus, enumName: 'platform_review_status', default: PlatformReviewStatus.Pending }) status!: PlatformReviewStatus
    @Column({ type: 'text', nullable: true }) organizationResponse!: string | null
    @Column({ type: 'uuid', nullable: true }) respondedById!: string | null
    @Column({ type: 'timestamptz', nullable: true }) organizationRespondedAt!: Date | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}
