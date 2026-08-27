import { env } from '../config/env.js'
import { assertProductionAutoCareAttachmentPolicy } from '../modules/autocare/attachment-storage-policy.js'
import { AUTOCARE_DELETION_INVARIANTS } from '../modules/users/account-deletion-invariants.js'
import { assertSafeAutoCareAttachmentObjectKey } from '../modules/autocare/autocare-attachment-storage.js'
import { resolveRedisRateLimitFailureMode } from '../config/redis-rate-limit-policy.js'

type SecurityCheck = {
    name: string
    run: () => void
}

const checks: SecurityCheck[] = [
    {
        name: 'production Redis rate limit policy is fail-closed',
        run: () => {
            if (resolveRedisRateLimitFailureMode('production') !== 'fail-closed') {
                throw new Error('Production Redis rate limit policy is not fail-closed.')
            }
        },
    },
    {
        name: 'production AutoCare attachments require private S3 and ClamAV',
        run: () => assertProductionAutoCareAttachmentPolicy({
            nodeEnv: 'production',
            storageProvider: 's3',
            antivirusMode: 'clamav',
        }),
    },
    {
        name: 'filesystem attachments are rejected by production policy',
        run: () => {
            try {
                assertProductionAutoCareAttachmentPolicy({
                    nodeEnv: 'production',
                    storageProvider: 'filesystem',
                    antivirusMode: 'clamav',
                })
            } catch {
                return
            }
            throw new Error('Production filesystem attachments were accepted.')
        },
    },
    {
        name: 'attachment object keys reject traversal',
        run: () => {
            try {
                assertSafeAutoCareAttachmentObjectKey('../private/file.bin')
            } catch {
                return
            }
            throw new Error('Unsafe attachment object key was accepted.')
        },
    },
    {
        name: 'account deletion invariant inventory is present',
        run: () => {
            const requiredNames = [
                'owned providers are detached',
                'account-related attachment metadata is removed',
                'bonus ledger entries are removed',
                'AutoCare reviews are detached',
                'service request private snapshots are redacted',
                'security events are detached',
            ]
            const names = new Set(AUTOCARE_DELETION_INVARIANTS.map(({ name }) => name))
            if (requiredNames.some((name) => !names.has(name))) {
                throw new Error('Account deletion invariant inventory is incomplete.')
            }
        },
    },
]

function run() {
    for (const check of checks) {
        check.run()
        console.log(`[security-controls] PASS: ${check.name}`)
    }
    console.log(`[security-controls] ${checks.length} checks passed for ${env.nodeEnv}.`)
}

try {
    run()
} catch (error: unknown) {
    console.error(error instanceof Error ? error.message : 'Security control check failed.')
    process.exitCode = 1
}
