import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum AutoCareBonusLedgerType {
    Earn = 'earn',
    Redeem = 'redeem',
    Refund = 'refund',
    Expire = 'expire',
    Adjustment = 'adjustment',
}

@Entity('autocare_bonus_programs')
@Index(['providerId'], { unique: true })
export class AutoCareBonusProgramEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'text' }) name!: string
    @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 }) earnPercent!: number
    @Column({ type: 'integer', nullable: true }) maxEarnPointsPerVisit!: number | null
    @Column({ type: 'integer', nullable: true }) expiresAfterDays!: number | null
    @Column({ type: 'boolean', default: true }) active!: boolean
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}

@Entity('autocare_bonus_accounts')
@Index(['clientId', 'providerId'], { unique: true })
export class AutoCareBonusAccountEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) clientId!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'integer', default: 0 }) balancePoints!: number
    @Column({ type: 'integer', default: 0 }) earnedPoints!: number
    @Column({ type: 'integer', default: 0 }) redeemedPoints!: number
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}

@Entity('autocare_bonus_ledger')
@Index(['accountId', 'createdAt'])
@Index(['accountId', 'idempotencyKey'], { unique: true })
@Check('CHK_autocare_bonus_ledger_nonzero', '"points" <> 0')
export class AutoCareBonusLedgerEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) accountId!: string
    @Column({ type: 'uuid' }) clientId!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'uuid', nullable: true }) requestId!: string | null
    @Column({ type: 'enum', enum: AutoCareBonusLedgerType, enumName: 'autocare_bonus_ledger_type' }) type!: AutoCareBonusLedgerType
    @Column({ type: 'integer' }) points!: number
    @Column({ type: 'text' }) reason!: string
    @Column({ type: 'text' }) idempotencyKey!: string
    @Column({ type: 'timestamptz', nullable: true }) expiresAt!: Date | null
    @Column({ type: 'uuid', nullable: true }) actorId!: string | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
}
