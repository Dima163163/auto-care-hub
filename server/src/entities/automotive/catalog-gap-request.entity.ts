import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum AutomotiveCatalogGapRequestStatus {
    Pending = 'pending',
    Approved = 'approved',
    Rejected = 'rejected',
}

@Entity('autocare_catalog_gap_requests')
@Index(['status', 'createdAt'])
@Index(['proposedSlug', 'status'])
export class AutomotiveCatalogGapRequestEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) requestedById!: string
    @Column({ type: 'uuid', nullable: true }) providerId!: string | null
    @Column({ type: 'text' }) proposedSlug!: string
    @Column({ type: 'text' }) categorySlug!: string
    @Column({ type: 'jsonb', default: () => "'{}'" }) labels!: Record<string, string>
    @Column({ type: 'text' }) priceType!: string
    @Column({ type: 'jsonb', default: () => "'[]'" }) comparisonAttributes!: string[]
    @Column({ type: 'text' }) rationale!: string
    @Column({ type: 'enum', enum: AutomotiveCatalogGapRequestStatus, enumName: 'autocare_catalog_gap_request_status', default: AutomotiveCatalogGapRequestStatus.Pending }) status!: AutomotiveCatalogGapRequestStatus
    @Column({ type: 'uuid', nullable: true }) reviewedById!: string | null
    @Column({ type: 'text', nullable: true }) reviewReason!: string | null
    @Column({ type: 'timestamptz', nullable: true }) reviewedAt!: Date | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}
