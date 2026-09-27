import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { createEncryptedFieldTransformer } from '../../shared/security/data-encryption/field-encryption.js'

@Entity('client_vehicles')
@Index('IDX_client_vehicles_user_created', ['userId', 'createdAt'])
@Check('CHK_client_vehicles_year', '"year" BETWEEN 1950 AND 2100')
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
    @Column({ type: 'text', nullable: true, transformer: createEncryptedFieldTransformer('client_vehicles', 'vin', 'text') }) vin!: string | null
    @Column({ type: 'text', nullable: true, transformer: createEncryptedFieldTransformer('client_vehicles', 'licensePlate', 'text') }) licensePlate!: string | null
    @Column({ type: 'text', nullable: true, transformer: createEncryptedFieldTransformer('client_vehicles', 'internalNumber', 'text') }) internalNumber!: string | null
    @Column({ type: 'text', transformer: createEncryptedFieldTransformer('client_vehicles', 'imageUrl', 'text') }) imageUrl!: string
    @Column({ type: 'boolean', default: false }) isPrimary!: boolean
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
}
