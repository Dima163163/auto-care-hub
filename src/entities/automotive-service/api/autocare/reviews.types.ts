

export type AutoCareApiReview = {
    id: string
    providerId: string
    authorName: string
    vehicleLabel: string
    rating: number
    text: string
    avatarUrl: string | null
    photoUrls: string[]
    createdAt: string
    serviceRequestId?: string | null
    serviceSlug?: string | null
    revisionAllowedUntil?: string | null
    revisionUsedAt?: string | null
    canContact?: boolean
    canEdit?: boolean
    communityProfile?: { profileId: string; badgeCodes: Array<'verified_client' | 'regular_client' | 'helpful_reviewer' | 'autocare_expert'> } | null
    helpfulCount?: number
    providerName?: string
    providerAddress?: string
}

export type AutoCareCommunityMetrics = { confirmedVisits: number; publishedReviews: number; helpfulVoters: number }

export type AutoCareCommunityProfile = {
    enabled: boolean
    displayName: string | null
    publicProfileId: string | null
    profileUrl: string | null
    badgeCodes: Array<'verified_client' | 'regular_client' | 'helpful_reviewer' | 'autocare_expert'>
    metrics: AutoCareCommunityMetrics
}

export type PublicAutoCareCommunityProfile = Omit<AutoCareCommunityProfile, 'enabled' | 'publicProfileId' | 'profileUrl' | 'displayName'> & {
    profileId: string
    displayName: string
    avatarUrl: string | null
}

export type AdminAutoCareReview = AutoCareApiReview & {
    providerName: string
    status: 'pending' | 'approved' | 'rejected'
}

export type UpdateAdminAutoCareReviewStatusInput = {
    reviewId: string
    status: 'approved' | 'rejected'
    reason?: string
}

export type AutoCareReviewPromo = {
    id: string
    reviewId: string
    providerId: string
    serviceRequestId: string | null
    serviceSlug: string | null
    code: string
    discountPercent: number
    status: 'active' | 'redeemed' | 'revoked' | 'expired'
    expiresAt: string
    redeemedAt: string | null
}

export type IssueAutoCareReviewPromoInput = {
    providerId: string
    reviewId: string
    discountPercent: number
    serviceSlug?: string | null
    expiresInDays?: number
}

export type RedeemAutoCareReviewPromoInput = { code: string }

export type CreateAutoCareReviewInput = { requestId: string; rating: number; text: string }

export type UpdateAutoCareReviewInput = { reviewId: string; rating: number; text: string }

export type AutoCareApiProviderReviews = {
    providerId: string
    totalReviews: number
    averageRating: number
    distribution: Record<'1' | '2' | '3' | '4' | '5', number>
    reviews: AutoCareApiReview[]
}

export type OwnerAutoCareReviewsProvider = { id: string; name: string; address: string; rating: number; reviewCount: number }

export type OwnerAutoCareReviews = { selectedProviderId: string | null; providers: OwnerAutoCareReviewsProvider[]; totalReviews: number; averageRating: number; distribution: Record<'1' | '2' | '3' | '4' | '5', number>; reviews: AutoCareApiReview[] }
