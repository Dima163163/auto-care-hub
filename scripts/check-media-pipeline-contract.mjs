import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))

export const MEDIA_PIPELINE_CONTRACT = [
    {
        id: 'content-validation',
        file: 'server/src/modules/autocare/attachment-content.ts',
        fragments: ['AUTOCARE_ATTACHMENT_CONTENT_TYPES', 'matchesMagicBytes', 'sharp(content', '.rotate()', 'metadata.pages'],
        detail: 'MIME, magic bytes, decoder limits, EXIF stripping and format normalization are enforced before storage',
    },
    {
        id: 'private-storage-integrity',
        file: 'server/src/modules/autocare/autocare-attachment-storage.ts',
        fragments: ['createHash(\'sha256\')', 'ChecksumSHA256', "Metadata: { sha256: checksumHex, state: 'quarantine' }", "Metadata: { sha256: checksumHex, state: 'private' }", 'DeleteObjectCommand', 'assertAutoCareAttachmentChecksumMetadata'],
        detail: 'S3 promotion stores checksum/state metadata, verifies reads, and cleans quarantine objects',
    },
    {
        id: 'signed-download-policy',
        file: 'server/src/modules/autocare/autocare-attachment-storage.ts',
        fragments: ['ResponseContentDisposition: \'inline\'', 'ResponseCacheControl: \'private, no-store\'', 'getSignedUrl', 'getPrivateObjectKey'],
        detail: 'signed downloads are private, inline and cache-disabled after a HeadObject integrity check',
    },
    {
        id: 'route-media-headers',
        file: 'server/src/modules/autocare/autocare.routes.ts',
        fragments: ["header('cache-control', 'private, no-store')", "header('content-disposition', 'inline')", "header('etag'"],
        detail: 'HTTP media responses do not become shared caches and expose a checksum-bound ETag',
    },
    {
        id: 'production-preflight',
        file: 'server/src/scripts/check-production-media.ts',
        fragments: ['MAX_MEDIA_PREFLIGHT_RESPONSE_BYTES', 'readBoundedMediaResponse', 'validateSignedAttachmentUrl', 'validatePrivateObjectHead', '--json', 'clamav'],
        detail: 'production preflight covers private metadata, signed URL TTL/cache, bounded body reads and JSON diagnostics',
    },
    {
        id: 'deterministic-test-adapters',
        file: 'server/src/scripts/media-preflight-fakes.ts',
        fragments: ['DeterministicFakeS3Adapter', 'DeterministicFakeAntivirusAdapter', 'DETERMINISTIC_EICAR_PAYLOAD', 'operations', 'async scan'],
        detail: 'unit harnesses use deterministic in-memory S3 and clean/infected AV adapters without production credentials',
    },
]

export async function evaluateMediaPipelineContract(root = PROJECT_ROOT) {
    const results = []
    for (const contract of MEDIA_PIPELINE_CONTRACT) {
        let source
        try {
            source = await readFile(resolve(root, contract.file), 'utf8')
        } catch (error) {
            results.push({ id: contract.id, status: 'blocked', detail: `cannot read ${contract.file}: ${error instanceof Error ? error.message : String(error)}` })
            continue
        }
        const missing = contract.fragments.filter((fragment) => !source.includes(fragment))
        results.push(missing.length === 0
            ? { id: contract.id, status: 'pass', detail: contract.detail }
            : { id: contract.id, status: 'blocked', detail: `missing fragments: ${missing.join('; ')}` })
    }
    return results
}

export function formatMediaPipelineContract(results) {
    return ['Media pipeline source contract', ...results.map((result) => `[${result.status.toUpperCase()}] ${result.id}: ${result.detail}`)].join('\n')
}

async function main() {
    const results = await evaluateMediaPipelineContract()
    console.log(formatMediaPipelineContract(results))
    if (results.some((result) => result.status === 'blocked')) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
