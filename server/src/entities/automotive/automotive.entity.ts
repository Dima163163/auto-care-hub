import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
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

export enum AutomotiveLocationZoneType {
    District = 'district',
    Neighborhood = 'neighborhood',
    ServiceArea = 'service_area',
}

export type AutomotiveWeeklyScheduleDay = {
    open: string
    close: string
    closed: boolean
}

export type AutomotiveWeeklySchedule = Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', AutomotiveWeeklyScheduleDay>

@Entity('autocare_markets')
@Index(['countryCode', 'cityCode'], { unique: true })
export class AutomotiveMarketEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'text' }) countryCode!: string
    @Column({ type: 'text' }) countryName!: string
    @Column({ type: 'text' }) cityCode!: string
    @Column({ type: 'text' }) cityName!: string
    @Column({ type: 'text', nullable: true }) regionCode!: string | null
    @Column({ type: 'text', nullable: true }) regionName!: string | null
    @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true }) centerLatitude!: number | null
    @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true }) centerLongitude!: number | null
    @Column({ type: 'text' }) currencyCode!: string
    @Column({ type: 'text' }) defaultLocale!: string
    @Column('text', { array: true, default: () => "'{}'" }) supportedLocales!: string[]
    @Column({ type: 'text' }) timezone!: string
    @Column({ type: 'boolean', default: false }) launchReady!: boolean
}

@Entity('autocare_location_zones')
@Index(['marketId', 'parentId', 'active'])
@Index(['marketId', 'slug'], { unique: true })
export class AutomotiveLocationZoneEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) marketId!: string
    @Column({ type: 'uuid', nullable: true }) parentId!: string | null
    @Column({ type: 'text' }) slug!: string
    @Column({ type: 'enum', enum: AutomotiveLocationZoneType, enumName: 'autocare_location_zone_type' }) zoneType!: AutomotiveLocationZoneType
    @Column({ type: 'jsonb', default: () => "'{}'" }) names!: Record<string, string>
    @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true }) centerLatitude!: number | null
    @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true }) centerLongitude!: number | null
    @Column({ type: 'numeric', precision: 7, scale: 2, nullable: true }) radiusKm!: number | null
    @Column({ type: 'text', nullable: true }) imageUrl!: string | null
    @Column({ type: 'integer', default: 0 }) displayOrder!: number
    @Column({ type: 'boolean', default: true }) active!: boolean
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
    @Column({ type: 'text', nullable: true }) phone!: string | null
    @Column('text', { array: true, default: () => "'{}'" }) phones!: string[]
    @Column({ type: 'text', nullable: true }) email!: string | null
    @Column({ type: 'text', nullable: true }) websiteUrl!: string | null
    @Column({ type: 'text', nullable: true }) metroStation!: string | null
    @Column({ type: 'integer', default: 0 }) workstationCount!: number
    @Column({ type: 'text', nullable: true }) warrantyText!: string | null
    @Column({ type: 'text', nullable: true }) logoUrl!: string | null
    @Column({ type: 'text', nullable: true }) coverImageUrl!: string | null
    @Column('text', { array: true, default: () => "'{}'" }) galleryImageUrls!: string[]
    @Column('text', { array: true, default: () => "'{}'" }) amenityIds!: string[]
    @Column('text', { array: true, default: () => "'{}'" }) brandSpecializations!: string[]
    @Column({ type: 'boolean', default: false }) isMultibrand!: boolean
    @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 }) trustScore!: number
    @Column({ type: 'text', nullable: true }) trustBadge!: string | null
    @Column({ type: 'timestamptz', nullable: true }) trustReassessedAt!: Date | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
}

@Entity('autocare_service_locations')
@Index(['marketId', 'providerId'])
export class AutomotiveServiceLocationEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'uuid' }) marketId!: string
    @Column({ type: 'uuid', nullable: true }) zoneId!: string | null
    @Column({ type: 'text' }) address!: string
    @Column({ type: 'text' }) hours!: string
    @Column({ type: 'text', default: 'UTC' }) timezone!: string
    @Column({ type: 'jsonb', default: () => "'{\"mon\":{\"open\":\"08:00\",\"close\":\"21:00\",\"closed\":false},\"tue\":{\"open\":\"08:00\",\"close\":\"21:00\",\"closed\":false},\"wed\":{\"open\":\"08:00\",\"close\":\"21:00\",\"closed\":false},\"thu\":{\"open\":\"08:00\",\"close\":\"21:00\",\"closed\":false},\"fri\":{\"open\":\"08:00\",\"close\":\"21:00\",\"closed\":false},\"sat\":{\"open\":\"08:00\",\"close\":\"21:00\",\"closed\":false},\"sun\":{\"open\":\"08:00\",\"close\":\"21:00\",\"closed\":false}}'" }) weeklySchedule!: AutomotiveWeeklySchedule
    @Column('date', { array: true, default: () => "'{}'" }) blackoutDates!: string[]
    @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true }) latitude!: number | null
    @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true }) longitude!: number | null
    @Column({ type: 'boolean', default: false }) supportsMobile!: boolean
    @Column({ type: 'boolean', default: false }) supportsPickup!: boolean
    @Column({ type: 'numeric', precision: 7, scale: 2, nullable: true }) coverageRadiusKm!: number | null
    @Column({ type: 'integer', default: 0 }) dispatchBasePriceMinor!: number
    @Column({ type: 'integer', nullable: true }) etaMinutes!: number | null
}

@Entity('autocare_service_offerings')
@Index(['locationId', 'definitionId'], { unique: true })
@Check('CHK_autocare_offering_prices', '"priceFromMinor" >= 0 AND ("priceToMinor" IS NULL OR "priceToMinor" >= "priceFromMinor")')
export class AutomotiveServiceOfferingEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) locationId!: string
    @Column({ type: 'uuid' }) definitionId!: string
    @Column({ type: 'text', nullable: true }) description!: string | null
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
    @Column({ type: 'uuid', nullable: true }) clientId!: string | null
    @Column({ type: 'uuid', nullable: true }) serviceRequestId!: string | null
    @Column({ type: 'boolean', default: false }) verifiedVisit!: boolean
    @Column({ type: 'text', nullable: true }) serviceSlug!: string | null
    @Column({ type: 'timestamptz', nullable: true }) revisionAllowedUntil!: Date | null
    @Column({ type: 'timestamptz', nullable: true }) revisionUsedAt!: Date | null
    @Column({ type: 'enum', enum: AutomotiveReviewStatus, enumName: 'autocare_review_status', default: AutomotiveReviewStatus.Approved }) status!: AutomotiveReviewStatus
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
    @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}

export enum AutomotiveReviewPromoStatus {
    Active = 'active',
    Redeemed = 'redeemed',
    Revoked = 'revoked',
    Expired = 'expired',
}

@Entity('autocare_review_promos')
@Index(['providerId', 'createdAt'])
@Index(['code'], { unique: true })
export class AutomotiveReviewPromoEntity {
    @PrimaryGeneratedColumn('uuid') id!: string
    @Column({ type: 'uuid' }) providerId!: string
    @Column({ type: 'uuid' }) reviewId!: string
    @Column({ type: 'uuid', nullable: true }) clientId!: string | null
    @Column({ type: 'uuid', nullable: true }) serviceRequestId!: string | null
    @Column({ type: 'text', nullable: true }) serviceSlug!: string | null
    @Column({ type: 'text' }) code!: string
    @Column({ type: 'integer' }) discountPercent!: number
    @Column({ type: 'enum', enum: AutomotiveReviewPromoStatus, enumName: 'autocare_review_promo_status', default: AutomotiveReviewPromoStatus.Active }) status!: AutomotiveReviewPromoStatus
    @Column({ type: 'timestamptz' }) expiresAt!: Date
    @Column({ type: 'timestamptz', nullable: true }) redeemedAt!: Date | null
    @Column({ type: 'uuid', nullable: true }) redeemedById!: string | null
    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
}
