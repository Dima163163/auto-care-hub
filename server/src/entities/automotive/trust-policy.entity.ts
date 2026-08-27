import {
    Column,
    Entity,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm'

/** A single, auditable platform policy used by trust-score and rollout gates. */
@Entity('autocare_trust_policy')
export class AutoCareTrustPolicyEntity {
    @PrimaryColumn({ type: 'text' }) id!: string
    @Column({ type: 'text' }) policyVersion!: string
    @Column({ type: 'numeric', precision: 3, scale: 2 }) trustedMinimumRating!: number
    @Column({ type: 'integer' }) trustedMinimumReviews!: number
    @Column({ type: 'integer' }) trustedMinimumCompletedVisits!: number
    @Column({ type: 'numeric', precision: 4, scale: 3 }) trustedMaxNoShowRate!: number
    @Column({ type: 'numeric', precision: 4, scale: 3 }) trustedMaxComplaintRate!: number
    @Column({ type: 'integer' }) trustedMaxResponseTimeMinutes!: number
    @Column({ type: 'integer' }) reassessmentIntervalHours!: number
    @Column({ type: 'boolean' }) rolloutEnabled!: boolean
    @Column('text', { array: true }) rolloutMarketIds!: string[]
    @Column({ type: 'integer' }) rolloutPercentage!: number
    @Column({ type: 'uuid', nullable: true }) updatedById!: string | null
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}
