import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm'

export enum AutomotiveProviderStatus {
    Draft = 'draft',
    Active = 'active',
    Suspended = 'suspended',
}

export enum AutomotivePriceType {
    Fixed = 'fixed',
    From = 'from',
    Range = 'range',
    QuoteRequired = 'quote_required',
}

export enum AutomotiveReviewStatus {
    Approved = 'approved',
    Pending = 'pending',
    Rejected = 'rejected',
}

@Entity('autocare_markets')
@Index(['countryCode', 'cityCode'], { unique: true })
export class AutomotiveMarketEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'text' }) countryCode!: string
    @Column({ type: 'text' }) countryName!: string
    @Column({ type: 'text' }) cityCode!: string
    @Column({ type: 'text' }) cityName!: string
    @Column({ type: 'text' }) currencyCode!: string
    @Column({ type: 'text' }) defaultLocale!: string
    @Column('text', { array: true, default: () => "'{}'" }) supportedLocales!: string[]
    @Column({ type: 'text' }) timezone!: string
    @Column({ type: 'boolean', default: false }) launchReady!: boolean
}

@Entity('autocare_service_definitions')
@Index(['slug'], { unique: true })
export class AutomotiveServiceDefinitionEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'text' }) slug!: string
    @Column({ type: 'text' }) categorySlug!: string
    @Column({ type: 'jsonb', default: () => "'{}'" }) labels!: Record<string, string>
    @Column({ type: 'enum', enum: AutomotivePriceType, enumName: 'autocare_price_type' }) priceType!: AutomotivePriceType
    @Column({ type: 'jsonb', default: () => "'[]'" }) comparisonAttributes!: string[]
    @Column({ type: 'boolean', default: true }) active!: boolean
}

@Entity('autocare_providers')
@Index(['status', 'createdAt'])
@Index('IDX_autocare_provider_owner', ['ownerId', 'createdAt'])
export class AutomotiveProviderEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid', nullable: true }) ownerId!: string | null
    @Column({ type: 'text' }) name!: string
    @Column({ type: 'text', nullable: true }) description!: string | null
    @Column({ type: 'enum', enum: AutomotiveProviderStatus, enumName: 'autocare_provider_status', default: AutomotiveProviderStatus.Draft }) status!: AutomotiveProviderStatus
    @Column({ type: 'boolean', default: false }) verified!: boolean
    @Column({ type: 'integer', default: 0 }) yearsActive!: number
    @Column({ type: 'integer', default: 0 }) staffCount!: number
    @Column({ type: 'numeric', precision: 2, scale: 1, default: 0 }) rating!: number
    @Column({ type: 'integer', default: 0 }) reviewCount!: number
    @Column({ type: 'text', nullable: true }) bonusSummary!: string | null
    @Column({ type: 'text', nullable: true }) logoUrl!: string | null
    @Column({ type: 'text', nullable: true }) coverImageUrl!: string | null
    @Column('text', { array: true, default: () => "'{}'" }) galleryImageUrls!: string[]
    @Column('text', { array: true, default: () => "'{}'" }) amenityIds!: string[]
    @Column('text', { array: true, default: () => "'{}'" }) brandSpecializations!: string[]
    @Column({ type: 'boolean', default: false }) isMultibrand!: boolean
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
}

@Entity('autocare_service_locations')
@Index(['marketId', 'providerId'])
export class AutomotiveServiceLocationEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'uuid' }) marketId!: string
    @Column({ type: 'text' }) address!: string
    @Column({ type: 'text' }) hours!: string
    @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true }) latitude!: number | null
    @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true }) longitude!: number | null
}

@Entity('autocare_service_offerings')
@Index(['locationId', 'definitionId'], { unique: true })
@Check('CHK_autocare_offering_prices', '"priceFromMinor" >= 0 AND ("priceToMinor" IS NULL OR "priceToMinor" >= "priceFromMinor")')
export class AutomotiveServiceOfferingEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) locationId!: string
    @Column({ type: 'uuid' }) definitionId!: string
    @Column({ type: 'integer' }) priceFromMinor!: number
    @Column({ type: 'integer', nullable: true }) priceToMinor!: number | null
    @Column({ type: 'text' }) currencyCode!: string
    @Column({ type: 'integer' }) durationMinutes!: number
    @Column({ type: 'jsonb', default: () => "'[]'" }) inclusions!: string[]
    @Column({ type: 'text', nullable: true }) warrantyText!: string | null
    @Column({ type: 'boolean', default: true }) active!: boolean
}

@Entity('autocare_reviews')
@Index(['providerId', 'status', 'createdAt'])
export class AutomotiveReviewEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'text' }) authorName!: string
    @Column({ type: 'text' }) vehicleLabel!: string
    @Column({ type: 'integer' }) rating!: number
    @Column({ type: 'text' }) text!: string
    @Column({ type: 'text', nullable: true }) avatarUrl!: string | null
    @Column('text', { array: true, default: () => "'{}'" }) photoUrls!: string[]
    @Column({ type: 'enum', enum: AutomotiveReviewStatus, enumName: 'autocare_review_status', default: AutomotiveReviewStatus.Approved }) status!: AutomotiveReviewStatus
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
}
