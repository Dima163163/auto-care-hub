import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum AutomotiveProviderChangeRequestKind {
    Verification = 'verification',
    ProfileUpdate = 'profile_update',
}

export enum AutomotiveProviderChangeRequestStatus {
    Pending = 'pending',
    Approved = 'approved',
    Rejected = 'rejected',
    Cancelled = 'cancelled',
}

@Entity('autocare_provider_change_requests')
@Index(['providerId', 'status', 'createdAt'])
@Index(['kind', 'status', 'createdAt'])
export class AutomotiveProviderChangeRequestEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'uuid' }) requestedById!: string
    @Column({ type: 'enum', enum: AutomotiveProviderChangeRequestKind, enumName: 'autocare_provider_change_request_kind' }) kind!: AutomotiveProviderChangeRequestKind
    @Column({ type: 'enum', enum: AutomotiveProviderChangeRequestStatus, enumName: 'autocare_provider_change_request_status', default: AutomotiveProviderChangeRequestStatus.Pending }) status!: AutomotiveProviderChangeRequestStatus
    @Column({ type: 'jsonb', default: () => "'{}'" }) payload!: Record<string, unknown>
    @Column({ type: 'uuid', nullable: true }) reviewedById!: string | null
    @Column({ type: 'text', nullable: true }) reviewReason!: string | null
    @Column({ type: 'timestamptz', nullable: true }) reviewedAt!: Date | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}
