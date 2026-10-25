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
