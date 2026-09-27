import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'
import { emailBlindIndexTransformer } from '../../shared/security/data-encryption/field-encryption.js'

export enum AutomotiveProviderInvitationRole {
    Manager = 'manager',
    Staff = 'staff',
}

export enum AutomotiveProviderInvitationStatus {
    Pending = 'pending',
    Accepted = 'accepted',
    Revoked = 'revoked',
    Expired = 'expired',
}

@Entity('autocare_provider_invitations')
@Index(['providerId', 'status', 'createdAt'])
@Index(['email', 'status'])
@Index(['tokenHash'], { unique: true })
export class AutomotiveProviderInvitationEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'text', transformer: emailBlindIndexTransformer }) email!: string
    @Column({ type: 'text' }) emailCiphertext!: string
    @Column({ type: 'uuid', nullable: true }) locationId!: string | null
    @Column({ type: 'enum', enum: AutomotiveProviderInvitationRole, enumName: 'autocare_provider_invitation_role' }) role!: AutomotiveProviderInvitationRole
    @Column({ type: 'enum', enum: AutomotiveProviderInvitationStatus, enumName: 'autocare_provider_invitation_status', default: AutomotiveProviderInvitationStatus.Pending }) status!: AutomotiveProviderInvitationStatus
    @Column({ type: 'char', length: 64 }) tokenHash!: string
    @Column({ type: 'uuid' }) invitedById!: string
    @Column({ type: 'timestamptz' }) expiresAt!: Date
    @Column({ type: 'timestamptz', nullable: true }) acceptedAt!: Date | null
    @Column({ type: 'timestamptz', nullable: true }) revokedAt!: Date | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}
