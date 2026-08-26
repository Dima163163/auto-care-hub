import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('client_vehicles')
@Index('IDX_client_vehicles_user_created', ['userId', 'createdAt'])
@Check('CHK_client_vehicles_year', '"year" BETWEEN 1950 AND 2100')
@Check('CHK_client_vehicles_vin', '"vin" IS NULL OR char_length("vin") = 17')
export class ClientVehicleEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) userId!: string
    @Column({ type: 'text' }) brandId!: string
    @Column({ type: 'text' }) model!: string
    @Column({ type: 'integer' }) year!: number
    @Column({ type: 'text' }) fuelType!: string
    @Column({ type: 'numeric', precision: 3, scale: 1, nullable: true }) engineDisplacement!: number | null
    @Column({ type: 'integer', nullable: true }) horsepower!: number | null
    @Column({ type: 'text' }) color!: string
    @Column({ type: 'text', nullable: true }) vin!: string | null
    @Column({ type: 'text', nullable: true }) licensePlate!: string | null
    @Column({ type: 'text', nullable: true }) internalNumber!: string | null
    @Column({ type: 'text' }) imageUrl!: string
    @Column({ type: 'boolean', default: false }) isPrimary!: boolean
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
}
