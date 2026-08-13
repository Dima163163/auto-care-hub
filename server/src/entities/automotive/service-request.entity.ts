import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'

export enum ServiceRequestStatus {
    Draft = 'draft',
    Open = 'open',
    AwaitingReply = 'awaiting_reply',
    EstimateShared = 'estimate_shared',
    Accepted = 'accepted',
    Declined = 'declined',
    Closed = 'closed',
}

@Entity('autocare_service_requests')
@Index(['clientId', 'createdAt'])
@Index(['providerId', 'status', 'createdAt'])
@Check('CHK_autocare_service_requests_note', '"note" IS NULL OR char_length("note") <= 4000')
export class ServiceRequestEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) clientId!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'uuid' }) locationId!: string
    @Column({ type: 'uuid' }) definitionId!: string
    @Column({ type: 'uuid', nullable: true }) offeringId!: string | null
    @Column({ type: 'jsonb', nullable: true }) vehicleSnapshot!: Record<string, unknown> | null
    @Column({ type: 'jsonb', nullable: true }) contactSnapshot!: Record<string, unknown> | null
    @Column({ type: 'timestamptz', nullable: true }) preferredAt!: Date | null
    @Column({ type: 'text', nullable: true }) note!: string | null
    @Column({ type: 'enum', enum: ServiceRequestStatus, enumName: 'autocare_service_request_status', default: ServiceRequestStatus.Draft }) status!: ServiceRequestStatus
    @Column({ type: 'timestamptz', nullable: true }) clientConfirmedAt!: Date | null
    @Column({ type: 'timestamptz', nullable: true }) providerConfirmedAt!: Date | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}

export enum ServiceMessageKind {
    Text = 'text',
    System = 'system',
}

@Entity('autocare_service_messages')
@Index(['requestId', 'createdAt'])
@Check('CHK_autocare_service_messages_body', '"body" IS NULL OR char_length("body") BETWEEN 1 AND 4000')
export class ServiceMessageEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) requestId!: string
    @Column({ type: 'uuid' }) senderId!: string
    @Column({ type: 'enum', enum: ServiceMessageKind, enumName: 'autocare_service_message_kind', default: ServiceMessageKind.Text }) kind!: ServiceMessageKind
    @Column({ type: 'text', nullable: true }) body!: string | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
}

export enum ServiceAttachmentStatus {
    Pending = 'pending',
    Ready = 'ready',
    Rejected = 'rejected',
}

@Entity('autocare_service_attachments')
@Index(['requestId', 'createdAt'])
@Check('CHK_autocare_service_attachments_bytes', '"bytes" BETWEEN 1 AND 10485760')
export class ServiceAttachmentEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) requestId!: string
    @Column({ type: 'uuid' }) uploadedById!: string
    @Column({ type: 'text' }) objectKey!: string
    @Column({ type: 'text' }) contentType!: string
    @Column({ type: 'integer' }) bytes!: number
    @Column({ type: 'text', nullable: true }) checksum!: string | null
    @Column({ type: 'enum', enum: ServiceAttachmentStatus, enumName: 'autocare_service_attachment_status', default: ServiceAttachmentStatus.Pending }) status!: ServiceAttachmentStatus
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
}
