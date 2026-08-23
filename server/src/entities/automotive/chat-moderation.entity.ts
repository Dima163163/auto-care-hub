import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'

export enum AutoCareChatReportCategory {
    Spam = 'spam',
    Harassment = 'harassment',
    Fraud = 'fraud',
    Unsafe = 'unsafe',
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
@Index('UQ_autocare_chat_reports_reporter_thread', ['threadId', 'reporterId'], { unique: true })
@Check('CHK_autocare_chat_reports_description', '"description" IS NULL OR char_length("description") BETWEEN 1 AND 2000')
@Check('CHK_autocare_chat_reports_reason', '"resolutionReason" IS NULL OR char_length("resolutionReason") BETWEEN 1 AND 2000')
export class AutoCareChatReportEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) threadId!: string
    @Column({ type: 'uuid' }) reporterId!: string
    @Column({ type: 'uuid', nullable: true }) reportedUserId!: string | null
    @Column({ type: 'enum', enum: AutoCareChatReportCategory, enumName: 'autocare_chat_report_category' }) category!: AutoCareChatReportCategory
    @Column({ type: 'text', nullable: true }) description!: string | null
    @Column({ type: 'enum', enum: AutoCareChatReportStatus, enumName: 'autocare_chat_report_status', default: AutoCareChatReportStatus.Pending }) status!: AutoCareChatReportStatus
    @Column({ type: 'uuid', nullable: true }) reviewedById!: string | null
    @Column({ type: 'text', nullable: true }) resolutionReason!: string | null
    @Column({ type: 'timestamptz', nullable: true }) reviewedAt!: Date | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}

@Entity('autocare_chat_blocks')
@Index(['threadId', 'status'])
@Index(['blockedUserId', 'status'])
@Index('UQ_autocare_chat_blocks_scope', ['threadId', 'blockerId', 'blockedUserId'], { unique: true })
export class AutoCareChatBlockEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) threadId!: string
    @Column({ type: 'uuid' }) blockerId!: string
    @Column({ type: 'uuid' }) blockedUserId!: string
    @Column({ type: 'enum', enum: AutoCareChatBlockStatus, enumName: 'autocare_chat_block_status', default: AutoCareChatBlockStatus.Active }) status!: AutoCareChatBlockStatus
    @Column({ type: 'text', nullable: true }) reason!: string | null
    @Column({ type: 'timestamptz', nullable: true }) revokedAt!: Date | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}
