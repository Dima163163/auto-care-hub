import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'
import { createEncryptedFieldTransformer } from '../../shared/security/data-encryption/field-encryption.js'

export enum AutoCareChatReportCategory {
    Spam = 'spam',
    Harassment = 'harassment',
    Fraud = 'fraud',
    Unsafe = 'unsafe',
    Threat = 'threat',
    Other = 'other',
}

export enum AutoCareChatReportStatus {
    Pending = 'pending',
    Resolved = 'resolved',
    Dismissed = 'dismissed',
}

export enum AutoCareChatBlockStatus {
    Active = 'active',
    Revoked = 'revoked',
}

@Entity('autocare_chat_reports')
@Index(['status', 'createdAt'])
@Index(['threadId', 'createdAt'])
@Index('IDX_autocare_chat_reports_message', ['reportedMessageId'], { where: '"reportedMessageId" IS NOT NULL' })
@Index('IDX_autocare_chat_reports_related', ['relatedReportId'], { where: '"relatedReportId" IS NOT NULL' })
@Index('IDX_autocare_chat_reports_assigned_status_expiry', ['assignedModeratorId', 'status', 'accessExpiresAt'])
@Index('UQ_autocare_chat_reports_thread_reporter_message', ['threadId', 'reporterId', 'reportedMessageId'], { unique: true, where: '"reportedMessageId" IS NOT NULL' })
export class AutoCareChatReportEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) threadId!: string
    @Column({ type: 'uuid', nullable: true }) reportedMessageId!: string | null
    @Column({ type: 'uuid', nullable: true }) relatedReportId!: string | null
    @Column({ type: 'uuid' }) reporterId!: string
    @Column({ type: 'uuid', nullable: true }) reportedUserId!: string | null
    @Column({ type: 'enum', enum: AutoCareChatReportCategory, enumName: 'autocare_chat_report_category' }) category!: AutoCareChatReportCategory
    @Column({ type: 'text', nullable: true, transformer: createEncryptedFieldTransformer('autocare_chat_reports', 'description', 'text') }) description!: string | null
    @Column({ type: 'enum', enum: AutoCareChatReportStatus, enumName: 'autocare_chat_report_status', default: AutoCareChatReportStatus.Pending }) status!: AutoCareChatReportStatus
    @Column({ type: 'uuid', nullable: true }) reviewedById!: string | null
    @Column({ type: 'text', nullable: true, transformer: createEncryptedFieldTransformer('autocare_chat_reports', 'resolutionReason', 'text') }) resolutionReason!: string | null
    @Column({ type: 'timestamptz', nullable: true }) reviewedAt!: Date | null
    @Column({ type: 'timestamptz', nullable: true }) overturnedAt!: Date | null
    @Column({ type: 'timestamptz', nullable: true }) acknowledgedAt!: Date | null
    @Column({ type: 'varchar', length: 32, nullable: true }) policyVersion!: string | null
    @Column({ type: 'uuid', nullable: true }) assignedModeratorId!: string | null
    @Column({ type: 'uuid', nullable: true }) assignedById!: string | null
    @Column({ type: 'text', nullable: true, transformer: createEncryptedFieldTransformer('autocare_chat_reports', 'assignmentReason', 'text') }) assignmentReason!: string | null
    @Column({ type: 'timestamptz', nullable: true }) assignedAt!: Date | null
    @Column({ type: 'timestamptz', nullable: true }) accessExpiresAt!: Date | null
    @Column({ type: 'boolean', default: false }) extensionUsed!: boolean
    @Column({ type: 'text', nullable: true, transformer: createEncryptedFieldTransformer('autocare_chat_reports', 'extensionReason', 'text') }) extensionReason!: string | null
    @Column({ type: 'timestamptz', nullable: true }) extendedAt!: Date | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}

@Entity('autocare_chat_blocks')
@Index(['threadId', 'status'])
@Index(['blockedUserId', 'status'])
@Index('UQ_autocare_chat_blocks_user_scope', ['threadId', 'blockerId', 'blockedUserId'], { unique: true, where: '"sourceReportId" IS NULL AND "status" = \'active\'' })
@Index('UQ_autocare_chat_blocks_report', ['sourceReportId'], { unique: true, where: '"sourceReportId" IS NOT NULL' })
export class AutoCareChatBlockEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) threadId!: string
    @Column({ type: 'uuid' }) blockerId!: string
    @Column({ type: 'uuid' }) blockedUserId!: string
    @Column({ type: 'enum', enum: AutoCareChatBlockStatus, enumName: 'autocare_chat_block_status', default: AutoCareChatBlockStatus.Active }) status!: AutoCareChatBlockStatus
    @Column({ type: 'text', nullable: true, transformer: createEncryptedFieldTransformer('autocare_chat_blocks', 'reason', 'text') }) reason!: string | null
    @Column({ type: 'uuid', nullable: true }) sourceReportId!: string | null
    @Column({ type: 'timestamptz', nullable: true }) expiresAt!: Date | null
    @Column({ type: 'timestamptz', nullable: true }) revokedAt!: Date | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}
