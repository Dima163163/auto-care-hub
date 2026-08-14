import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'

@Entity('autocare_price_benchmarks')
@Index(['marketId', 'serviceDefinitionId', 'makeId', 'modelId', 'active'])
export class AutoCarePriceBenchmarkEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid', nullable: true }) marketId!: string | null
    @Column({ type: 'uuid' }) serviceDefinitionId!: string
    @Column({ type: 'text', nullable: true }) makeId!: string | null
    @Column({ type: 'text', nullable: true }) modelId!: string | null
    @Column({ type: 'text', nullable: true }) fuelType!: string | null
    @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true }) engineLiters!: number | null
    @Column({ type: 'integer' }) minPriceMinor!: number
    @Column({ type: 'integer' }) medianPriceMinor!: number
    @Column({ type: 'integer' }) maxPriceMinor!: number
    @Column({ type: 'text' }) currencyCode!: string
    @Column({ type: 'jsonb', default: () => "'{}'" }) methodology!: Record<string, unknown>
    @Column({ type: 'text', default: 'autocare' }) source!: string
    @Column({ type: 'boolean', default: true }) active!: boolean
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}

@Entity('autocare_trust_evidence')
@Index(['providerId', 'status', 'expiresAt'])
export class AutoCareTrustEvidenceEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'text' }) kind!: string
    @Column({ type: 'text' }) label!: string
    @Column({ type: 'text', default: 'pending' }) status!: string
    @Column({ type: 'timestamptz', nullable: true }) expiresAt!: Date | null
    @Column({ type: 'text', nullable: true }) reference!: string | null
    @Column({ type: 'text', nullable: true }) notes!: string | null
    @Column({ type: 'uuid', nullable: true }) verifiedById!: string | null
    @Column({ type: 'timestamptz', nullable: true }) verifiedAt!: Date | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}

@Entity('autocare_repair_events')
@Index(['requestId', 'createdAt'])
export class AutoCareRepairEventEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) requestId!: string
    @Column({ type: 'text' }) eventType!: string
    @Column({ type: 'uuid', nullable: true }) actorId!: string | null
    @Column({ type: 'text' }) title!: string
    @Column({ type: 'text', nullable: true }) notes!: string | null
    @Column({ type: 'jsonb', default: () => "'{}'" }) metadata!: Record<string, unknown>
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
}

@Entity('autocare_broadcast_requests')
@Index(['clientId', 'status', 'createdAt'])
export class AutoCareBroadcastRequestEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) clientId!: string
    @Column({ type: 'uuid' }) serviceDefinitionId!: string
    @Column({ type: 'uuid', nullable: true }) marketId!: string | null
    @Column({ type: 'text' }) issueDescription!: string
    @Column({ type: 'jsonb', nullable: true }) vehicleSnapshot!: Record<string, unknown> | null
    @Column({ type: 'jsonb', default: () => "'[]'" }) photoUrls!: string[]
    @Column({ type: 'timestamptz', nullable: true }) preferredAt!: Date | null
    @Column({ type: 'text', default: 'open' }) status!: string
    @Column({ type: 'integer', default: 5 }) maxProviders!: number
    @Column({ type: 'timestamptz' }) expiresAt!: Date
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}

@Entity('autocare_broadcast_offers')
@Index(['broadcastRequestId', 'providerId'], { unique: true })
export class AutoCareBroadcastOfferEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) broadcastRequestId!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'uuid' }) locationId!: string
    @Column({ type: 'jsonb' }) offerSnapshot!: Record<string, unknown>
    @Column({ type: 'text', default: 'pending' }) status!: string
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}

@Entity('autocare_guarantee_claims')
@Index(['providerId', 'status', 'createdAt'])
export class AutoCareGuaranteeClaimEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) requestId!: string
    @Column({ type: 'uuid' }) clientId!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'text' }) claimType!: string
    @Column({ type: 'text', default: 'submitted' }) status!: string
    @Column({ type: 'text' }) summary!: string
    @Column('text', { array: true, default: () => "'{}'" }) evidenceUrls!: string[]
    @Column({ type: 'text', nullable: true }) resolution!: string | null
    @Column({ type: 'uuid', nullable: true }) resolvedById!: string | null
    @Column({ type: 'timestamptz', nullable: true }) resolvedAt!: Date | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}

@Entity('autocare_expert_questions')
@Index(['clientId', 'status', 'createdAt'])
export class AutoCareExpertQuestionEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) clientId!: string
    @Column({ type: 'jsonb', nullable: true }) vehicleSnapshot!: Record<string, unknown> | null
    @Column({ type: 'text' }) symptoms!: string
    @Column({ type: 'text', nullable: true }) categorySlug!: string | null
    @Column({ type: 'text', default: 'open' }) status!: string
    @Column({ type: 'text', nullable: true }) answer!: string | null
    @Column({ type: 'uuid', nullable: true }) answeredById!: string | null
    @Column({ type: 'timestamptz', nullable: true }) answeredAt!: Date | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}

@Entity('autocare_fleet_accounts')
@Index(['ownerId', 'createdAt'])
export class AutoCareFleetAccountEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) ownerId!: string
    @Column({ type: 'text' }) name!: string
    @Column({ type: 'text', nullable: true }) notes!: string | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}

@Entity('autocare_fleet_vehicles')
@Index(['fleetId', 'createdAt'])
export class AutoCareFleetVehicleEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) fleetId!: string
    @Column({ type: 'text' }) label!: string
    @Column({ type: 'jsonb' }) vehicleSnapshot!: Record<string, unknown>
    @Column({ type: 'text', nullable: true }) approvalPolicy!: string | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}
