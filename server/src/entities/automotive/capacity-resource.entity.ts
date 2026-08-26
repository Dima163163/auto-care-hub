import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'

export enum AutoCareCapacityResourceType {
    Specialist = 'specialist',
    Bay = 'bay',
    Lift = 'lift',
    Equipment = 'equipment',
}

export enum AutoCareCapacityReservationStatus {
    Active = 'active',
    Released = 'released',
}

/** A bookable physical or human resource attached to one branch. */
@Entity('autocare_capacity_resources')
@Index(['locationId', 'active', 'type'])
@Index(['providerId', 'locationId', 'name'], { unique: true })
@Check('CHK_autocare_capacity_resources_capacity', '"capacity" BETWEEN 1 AND 100')
export class AutoCareCapacityResourceEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'uuid' }) locationId!: string
    @Column({ type: 'enum', enum: AutoCareCapacityResourceType, enumName: 'autocare_capacity_resource_type' }) type!: AutoCareCapacityResourceType
    @Column({ type: 'text' }) name!: string
    @Column({ type: 'integer', default: 1 }) capacity!: number
    @Column({ type: 'boolean', default: true }) active!: boolean
    @Column({ type: 'jsonb', default: () => "'{}'" }) metadata!: Record<string, unknown>
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}

/** Durable reservation rows make resource occupancy auditable and releasable. */
@Entity('autocare_capacity_reservations')
@Index(['resourceId', 'status', 'startsAt', 'endsAt'])
@Index('UQ_autocare_capacity_reservations_request_resource_active', ['requestId', 'resourceId'], { unique: true, where: '"status" = \'active\'' })
export class AutoCareCapacityReservationEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) requestId!: string
    @Column({ type: 'uuid' }) resourceId!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'uuid' }) locationId!: string
    @Column({ type: 'timestamptz' }) startsAt!: Date
    @Column({ type: 'timestamptz' }) endsAt!: Date
    @Column({ type: 'enum', enum: AutoCareCapacityReservationStatus, enumName: 'autocare_capacity_reservation_status', default: AutoCareCapacityReservationStatus.Active }) status!: AutoCareCapacityReservationStatus
    @Column({ type: 'timestamptz', nullable: true }) releasedAt!: Date | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
}
