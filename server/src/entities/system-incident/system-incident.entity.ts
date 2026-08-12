import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'

export enum SystemIncidentType {
    ServerError = 'server_error',
    HealthCheck = 'health_check',
    BackgroundJob = 'background_job',
    PaymentWebhook = 'payment_webhook',
}

export enum SystemIncidentSeverity {
    Warning = 'warning',
    Critical = 'critical',
}

export enum SystemIncidentStatus {
    Open = 'open',
    Acknowledged = 'acknowledged',
    Resolved = 'resolved',
}

@Entity('system_incidents')
@Index('IDX_system_incidents_last_occurred_id', ['lastOccurredAt', 'id'])
export class SystemIncidentEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({
        type: 'enum',
        enum: SystemIncidentType,
        enumName: 'system_incident_type',
    })
    type!: SystemIncidentType

    @Column({
        type: 'enum',
        enum: SystemIncidentSeverity,
        enumName: 'system_incident_severity',
    })
    severity!: SystemIncidentSeverity

    @Column({
        type: 'enum',
        enum: SystemIncidentStatus,
        enumName: 'system_incident_status',
        default: SystemIncidentStatus.Open,
    })
    status!: SystemIncidentStatus

    @Column({ type: 'text' })
    title!: string

    @Column({ name: 'request_id', type: 'text', nullable: true })
    requestId!: string | null

    @Column({ type: 'jsonb', default: {} })
    metadata!: Record<string, unknown>

    @Column({ name: 'occurrence_count', type: 'integer', default: 1 })
    occurrenceCount!: number

    @Column({ name: 'first_occurred_at', type: 'timestamptz' })
    firstOccurredAt!: Date

    @Column({ name: 'last_occurred_at', type: 'timestamptz' })
    lastOccurredAt!: Date

    @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
    acknowledgedAt!: Date | null

    @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
    resolvedAt!: Date | null

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date
}
