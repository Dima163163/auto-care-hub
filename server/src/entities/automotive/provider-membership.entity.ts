import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'

export enum AutomotiveProviderMembershipRole {
    Owner = 'owner',
    Manager = 'manager',
    Staff = 'staff',
}

export enum AutomotiveProviderMembershipStatus {
    Active = 'active',
    Revoked = 'revoked',
}

/**
 * A membership is either provider-wide (locationId = null) or limited to one
 * branch. The legacy provider.ownerId remains as a compatibility fallback
 * while all existing providers are backfilled into this table.
 */
@Entity('autocare_provider_memberships')
@Index(['providerId', 'userId', 'locationId'], { unique: true })
@Index(['userId', 'status', 'providerId'])
export class AutomotiveProviderMembershipEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'uuid' }) userId!: string
    @Column({ type: 'uuid', nullable: true }) locationId!: string | null
    @Column({ type: 'enum', enum: AutomotiveProviderMembershipRole, enumName: 'autocare_provider_membership_role' }) role!: AutomotiveProviderMembershipRole
    @Column({ type: 'enum', enum: AutomotiveProviderMembershipStatus, enumName: 'autocare_provider_membership_status', default: AutomotiveProviderMembershipStatus.Active }) status!: AutomotiveProviderMembershipStatus
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}
