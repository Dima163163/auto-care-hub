import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm'

import { UserEntity } from '../user/user.entity.js'

export enum SecurityMitigationKind {
    IpBlock = 'ip_block',
}

@Entity('security_mitigations')
@Index('IDX_security_mitigations_value_expires_at', ['value', 'expiresAt'])
@Index('IDX_security_mitigations_active_lookup', ['value', 'revokedAt', 'expiresAt'])
@Check('CHK_security_mitigations_kind', '"kind" IN (\'ip_block\')')
@Check('CHK_security_mitigations_value_length', 'length("value") BETWEEN 3 AND 128')
@Check('CHK_security_mitigations_display_value_length', 'length("display_value") BETWEEN 3 AND 64')
@Check('CHK_security_mitigations_reason_length', 'length("reason") BETWEEN 1 AND 500')
export class SecurityMitigationEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'text' })
    kind!: SecurityMitigationKind

    @Column({ type: 'text' })
    value!: string

    @Column({ name: 'display_value', type: 'text' })
    displayValue!: string

    @Column({ type: 'text' })
    reason!: string

    @Column({ name: 'expires_at', type: 'timestamptz' })
    expiresAt!: Date

    @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
    revokedAt!: Date | null

    @Column({ name: 'created_by', type: 'uuid' })
    createdBy!: string

    @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'created_by' })
    creator!: UserEntity

    @Column({ name: 'revoked_by', type: 'uuid', nullable: true })
    revokedBy!: string | null

    @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'revoked_by' })
    revoker!: UserEntity | null

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date
}
