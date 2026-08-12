export const ERROR_CODES = {
    ValidationError: 'VALIDATION_ERROR',
    NotFound: 'NOT_FOUND',
    InternalServerError: 'INTERNAL_SERVER_ERROR',
    BadRequest: 'BAD_REQUEST',
    Unauthorized: 'UNAUTHORIZED',
    Forbidden: 'FORBIDDEN',
    Conflict: 'CONFLICT',
    TooManyRequests: 'TOO_MANY_REQUESTS',
    CsrfOriginMismatch: 'CSRF_ORIGIN_MISMATCH',
    CsrfTokenMismatch: 'CSRF_TOKEN_MISMATCH',
    CabinetImageTooLarge: 'CABINET_IMAGE_TOO_LARGE',
    CabinetImageUnsupportedType: 'CABINET_IMAGE_UNSUPPORTED_TYPE',
    CabinetImageInvalidContent: 'CABINET_IMAGE_INVALID_CONTENT',
    CabinetImageInvalidFileName: 'CABINET_IMAGE_INVALID_FILE_NAME',
    ReviewStorageNotReady: 'REVIEW_STORAGE_NOT_READY',
    EmailVerificationRequired: 'EMAIL_VERIFICATION_REQUIRED',
    OAuthIdentityNotLinked: 'OAUTH_IDENTITY_NOT_LINKED',
    OAuthIdentityAlreadyLinked: 'OAUTH_IDENTITY_ALREADY_LINKED',
    OAuthLastLoginMethod: 'OAUTH_LAST_LOGIN_METHOD',
    BreachedPassword: 'BREACHED_PASSWORD',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
