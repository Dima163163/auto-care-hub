import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'

/**
 * Aggregated public-profile activity. The table deliberately stores no client
 * or device identifiers: it is sufficient for a provider's operational
 * analytics while keeping public browsing private.
 */
@Entity('autocare_provider_daily_metrics')
@Index(['providerId', 'day'], { unique: true })
export class AutoCareProviderDailyMetricEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'date' }) day!: string
    @Column({ type: 'integer', default: 0 }) impressions!: number
    @Column({ type: 'integer', default: 0 }) profileOpens!: number
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}
