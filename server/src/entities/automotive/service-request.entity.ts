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
    Cancelled = 'cancelled',
    NoShow = 'no_show',
    Closed = 'closed',
}

export enum AutoCareChatThreadType {
    ServiceRequest = 'service_request',
    ProviderInquiry = 'provider_inquiry',
    Support = 'support',
    AdminEscalation = 'admin_escalation',
}

export enum AutoCareChatThreadStatus {
    Open = 'open',
    Closed = 'closed',
}

@Entity('autocare_chat_threads')
@Index(['clientId', 'status', 'updatedAt'])
@Index(['providerId', 'status', 'updatedAt'])
@Index(['type', 'status', 'updatedAt'])
export class AutoCareChatThreadEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'enum', enum: AutoCareChatThreadType, enumName: 'autocare_chat_thread_type' }) type!: AutoCareChatThreadType
    @Column({ type: 'uuid', nullable: true }) requestId!: string | null
    @Column({ type: 'uuid', nullable: true }) providerId!: string | null
    @Column({ type: 'uuid', nullable: true }) clientId!: string | null
    @Column({ type: 'uuid', nullable: true }) createdById!: string | null
    @Column({ type: 'text' }) subject!: string
    @Column({ type: 'enum', enum: AutoCareChatThreadStatus, enumName: 'autocare_chat_thread_status', default: AutoCareChatThreadStatus.Open }) status!: AutoCareChatThreadStatus
    @Column({ type: 'timestamptz', nullable: true }) lastMessageAt!: Date | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}

export type AutomotiveOfferingSnapshot = {
    serviceSlug: string
    serviceLabels: Record<string, string>
    description: string | null
    priceFromMinor: number
    priceToMinor: number | null
    currencyCode: string
    durationMinutes: number
    inclusions: string[]
    warrantyText: string | null
    priceType: string
}

@Entity('autocare_service_requests')
@Index(['clientId', 'createdAt'])
@Index(['providerId', 'status', 'createdAt'])
@Index('IDX_autocare_service_requests_client_idempotency_key', ['clientId', 'idempotencyKey'], { unique: true })
@Check('CHK_autocare_service_requests_note', '"note" IS NULL OR char_length("note") <= 4000')
export class ServiceRequestEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) clientId!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'uuid' }) locationId!: string
    @Column({ type: 'uuid' }) definitionId!: string
    @Column({ type: 'uuid', nullable: true }) offeringId!: string | null
    @Column({ type: 'jsonb', nullable: true }) offeringSnapshot!: AutomotiveOfferingSnapshot | null
    @Column({ type: 'jsonb', nullable: true }) vehicleSnapshot!: Record<string, unknown> | null
    @Column({ type: 'jsonb', nullable: true }) contactSnapshot!: Record<string, unknown> | null
    @Column({ type: 'timestamptz', nullable: true }) preferredAt!: Date | null
    @Column({ type: 'text', nullable: true }) note!: string | null
    @Column({ name: 'idempotency_key', type: 'varchar', length: 128, nullable: true }) idempotencyKey!: string | null
    @Column({ type: 'jsonb', nullable: true }) estimateSnapshot!: Record<string, unknown> | null
    @Column({ type: 'enum', enum: ServiceRequestStatus, enumName: 'autocare_service_request_status', default: ServiceRequestStatus.Draft }) status!: ServiceRequestStatus
    @Column({ type: 'timestamptz', nullable: true }) clientConfirmedAt!: Date | null
    @Column({ type: 'timestamptz', nullable: true }) providerConfirmedAt!: Date | null
    @Column({ type: 'timestamptz', nullable: true }) cancelledAt!: Date | null
    @Column({ type: 'uuid', nullable: true }) cancelledById!: string | null
    @Column({ type: 'text', nullable: true }) cancellationReason!: string | null
    @Column({ type: 'timestamptz', nullable: true }) noShowAt!: Date | null
    @Column({ type: 'uuid', nullable: true }) noShowById!: string | null
    @Column({ type: 'text', nullable: true }) noShowReason!: string | null
    @Column({ type: 'timestamptz', nullable: true }) completedAt!: Date | null
    @Column({ type: 'uuid', nullable: true }) completedById!: string | null
    @Column({ type: 'text', nullable: true }) completionNote!: string | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}

export enum ServiceMessageKind {
    Text = 'text',
    System = 'system',
    Offer = 'offer',
}

export type ServiceMessageOffer = {
    type: 'discount' | 'alternative'
    title: string
    description: string | null
    discountPercent: number | null
    couponCode: string | null
    amountMinor: number | null
    currencyCode: string | null
    expiresAt: string | null
    status: 'pending' | 'accepted' | 'declined'
}

@Entity('autocare_service_messages')
@Index(['requestId', 'createdAt'])
@Check('CHK_autocare_service_messages_body', '"body" IS NULL OR char_length("body") BETWEEN 1 AND 4000')
export class ServiceMessageEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid', nullable: true }) requestId!: string | null
    @Column({ type: 'uuid', nullable: true }) threadId!: string | null
    @Column({ type: 'uuid' }) senderId!: string
    @Column({ type: 'enum', enum: ServiceMessageKind, enumName: 'autocare_service_message_kind', default: ServiceMessageKind.Text }) kind!: ServiceMessageKind
    @Column({ type: 'text', nullable: true }) body!: string | null
    @Column({ type: 'jsonb', nullable: true }) offer!: ServiceMessageOffer | null
    @Column({ type: 'timestamptz', nullable: true }) deliveredAt!: Date | null
    @Column({ type: 'timestamptz', nullable: true }) readAt!: Date | null
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
    @Column({ type: 'uuid', nullable: true }) requestId!: string | null
    @Column({ type: 'uuid', nullable: true }) threadId!: string | null
    @Column({ type: 'uuid' }) uploadedById!: string
    @Column({ type: 'text' }) objectKey!: string
    @Column({ type: 'text' }) contentType!: string
    @Column({ type: 'integer' }) bytes!: number
    @Column({ type: 'bytea', nullable: true, select: false }) content!: Buffer | null
    @Column({ type: 'text', nullable: true }) checksum!: string | null
    @Column({ type: 'enum', enum: ServiceAttachmentStatus, enumName: 'autocare_service_attachment_status', default: ServiceAttachmentStatus.Pending }) status!: ServiceAttachmentStatus
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
}
