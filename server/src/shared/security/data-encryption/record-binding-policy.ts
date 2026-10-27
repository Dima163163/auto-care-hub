export function requireEmailRecordBinding(environment: NodeJS.ProcessEnv = process.env) {
    const configured = environment.DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING
    if (configured === undefined || configured === 'false') return false
    if (configured === 'true') return true
    throw new Error('DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING must be true or false.')
}

export function requireOutboxRecordBinding(environment: NodeJS.ProcessEnv = process.env) {
    const configured = environment.DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING
    if (configured === undefined || configured === 'false') return false
    if (configured === 'true') return true
    throw new Error('DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING must be true or false.')
}

export function requireOAuthRecordBinding(environment: NodeJS.ProcessEnv = process.env) {
    const configured = environment.DATA_ENCRYPTION_REQUIRE_OAUTH_RECORD_BINDING
    if (configured === undefined || configured === 'false') return false
    if (configured === 'true') return true
    throw new Error('DATA_ENCRYPTION_REQUIRE_OAUTH_RECORD_BINDING must be true or false.')
}

export function requireUserProfileRecordBinding(environment: NodeJS.ProcessEnv = process.env) {
    const configured = environment.DATA_ENCRYPTION_REQUIRE_USER_PROFILE_RECORD_BINDING
    if (configured === undefined || configured === 'false') return false
    if (configured === 'true') return true
    throw new Error('DATA_ENCRYPTION_REQUIRE_USER_PROFILE_RECORD_BINDING must be true or false.')
}

export function requireMessageBodyRecordBinding(environment: NodeJS.ProcessEnv = process.env) {
    const configured = environment.DATA_ENCRYPTION_REQUIRE_MESSAGE_BODY_RECORD_BINDING
    if (configured === undefined || configured === 'false') return false
    if (configured === 'true') return true
    throw new Error('DATA_ENCRYPTION_REQUIRE_MESSAGE_BODY_RECORD_BINDING must be true or false.')
}

export function requireMessageOfferRecordBinding(environment: NodeJS.ProcessEnv = process.env) {
    const configured = environment.DATA_ENCRYPTION_REQUIRE_MESSAGE_OFFER_RECORD_BINDING
    if (configured === undefined || configured === 'false') return false
    if (configured === 'true') return true
    throw new Error('DATA_ENCRYPTION_REQUIRE_MESSAGE_OFFER_RECORD_BINDING must be true or false.')
}

export function requireChatSubjectRecordBinding(environment: NodeJS.ProcessEnv = process.env) {
    const configured = environment.DATA_ENCRYPTION_REQUIRE_CHAT_SUBJECT_RECORD_BINDING
    if (configured === undefined || configured === 'false') return false
    if (configured === 'true') return true
    throw new Error('DATA_ENCRYPTION_REQUIRE_CHAT_SUBJECT_RECORD_BINDING must be true or false.')
}

export function requireBookingSnapshotRecordBinding(environment: NodeJS.ProcessEnv = process.env) {
    const configured = environment.DATA_ENCRYPTION_REQUIRE_BOOKING_SNAPSHOT_RECORD_BINDING
    if (configured === undefined || configured === 'false') return false
    if (configured === 'true') return true
    throw new Error('DATA_ENCRYPTION_REQUIRE_BOOKING_SNAPSHOT_RECORD_BINDING must be true or false.')
}

export function requireAcceptedQuoteRecordBinding(environment: NodeJS.ProcessEnv = process.env) {
    const configured = environment.DATA_ENCRYPTION_REQUIRE_ACCEPTED_QUOTE_RECORD_BINDING
    if (configured === undefined || configured === 'false') return false
    if (configured === 'true') return true
    throw new Error('DATA_ENCRYPTION_REQUIRE_ACCEPTED_QUOTE_RECORD_BINDING must be true or false.')
}

export function requireEstimateSnapshotRecordBinding(environment: NodeJS.ProcessEnv = process.env) {
    const configured = environment.DATA_ENCRYPTION_REQUIRE_ESTIMATE_SNAPSHOT_RECORD_BINDING
    if (configured === undefined || configured === 'false') return false
    if (configured === 'true') return true
    throw new Error('DATA_ENCRYPTION_REQUIRE_ESTIMATE_SNAPSHOT_RECORD_BINDING must be true or false.')
}
