import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

export enum AutoCareQuoteStatus {
    Pending = 'pending',
    Accepted = 'accepted',
    Declined = 'declined',
    Expired = 'expired',
    Superseded = 'superseded',
}

@Entity('autocare_service_quotes')
@Index(['requestId', 'version'], { unique: true })
@Index(['providerId', 'createdAt'])
@Index(['status', 'validUntil'])
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
    @Column({ type: 'enum', enum: AutoCareQuoteStatus, enumName: 'autocare_quote_status', default: AutoCareQuoteStatus.Pending }) status!: AutoCareQuoteStatus
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
}
