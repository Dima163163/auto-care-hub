type SecurityHeadersOptionsInput = {
    isProduction: boolean
}

export function getSecurityHeadersOptions({
    isProduction,
}: SecurityHeadersOptionsInput) {
    return {
        noSniff: true,
        permissionsPolicy: {
            features: {
                camera: [],
                geolocation: [],
                microphone: [],
            },
        },
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                baseUri: ["'self'"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'", 'data:'],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
                frameSrc: ["'self'"],
                imgSrc: [
                    "'self'",
                    'data:',
                    'https://lh3.googleusercontent.com',
                    'https://avatars.yandex.net',
                ],
                objectSrc: ["'none'"],
                scriptSrc: isProduction
                    ? ["'self'"]
                    : ["'self'", "'unsafe-eval'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                upgradeInsecureRequests: isProduction ? [] : null,
            },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: {
            policy: 'cross-origin' as const,
        },
        hsts: isProduction
            ? {
                maxAge: 15552000,
                includeSubDomains: true,
            }
            : false,
        referrerPolicy: {
            policy: 'no-referrer' as const,
        },
        xFrameOptions: {
            action: 'deny' as const,
        },
    }
}
