import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm'

@Entity('autocare_review_helpful_votes')
@Index('UQ_autocare_review_helpful_votes_review_voter', ['reviewId', 'voterUserId'], { unique: true })
@Index('IDX_autocare_review_helpful_votes_voter_created', ['voterUserId', 'createdAt'])
@Index('IDX_autocare_review_helpful_votes_review_created', ['reviewId', 'createdAt'])
export class AutoCareReviewHelpfulVoteEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) reviewId!: string
    @Column({ type: 'uuid' }) voterUserId!: string
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
}
