import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('autocare_service_quotes')
@Index(['requestId', 'version'], { unique: true })
@Index(['providerId', 'createdAt'])
@Check('CHK_autocare_service_quotes_amount', '"amountMinor" >= 0')
export class AutoCareServiceQuoteEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) requestId!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'integer' }) version!: number
    @Column({ type: 'integer' }) amountMinor!: number
    @Column({ type: 'text' }) currencyCode!: string
    @Column({ type: 'jsonb' }) snapshot!: Record<string, unknown>
    @Column({ type: 'timestamptz', nullable: true }) validUntil!: Date | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
}
