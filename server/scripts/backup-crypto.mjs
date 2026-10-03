import { createCipheriv, createDecipheriv, pbkdf2, randomBytes } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { appendFile, lstat, open, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

// Version 1: magic(8), PBKDF2 iterations(4), salt(16), nonce(12), ciphertext, tag(16).
// The complete header is authenticated as AAD. No CBC fallback is accepted.
const MAGIC = Buffer.from('ACHBKP01')
const HEADER_BYTES = 40
const TAG_BYTES = 16
const derive = promisify(pbkdf2)

function validateIterations(value) {
    if (!Number.isInteger(value) || value < 600_000 || value > 2_000_000) {
        throw new Error('Backup PBKDF2 iterations must be between 600000 and 2000000.')
    }
    return value
}

async function deriveKey(passwordFile, salt, iterations) {
    if (!passwordFile) throw new Error('A backup password file is required.')
    const info = await stat(passwordFile)
    if (!info.isFile() || info.size > 4096) throw new Error('Backup password must be a small regular file.')
    const contents = await readFile(passwordFile)
    try {
        if (contents.length > 4096) throw new Error('Backup password file is too large.')
        const newline = contents.indexOf(10)
        let password = contents.subarray(0, newline < 0 ? contents.length : newline)
        if (password.at(-1) === 13) password = password.subarray(0, -1)
        if (!password.length) throw new Error('Backup password must not be empty.')
        return await derive(password, salt, iterations, 32, 'sha256')
    } finally {
        contents.fill(0)
    }
}

async function assertRegularInput(path) {
    const info = await lstat(path)
    if (!info.isFile()) throw new Error('Backup input must be a regular file.')
    return info
}

export async function encryptBackupFile({ inputPath, outputPath, passwordFile, iterations = 600_000 }) {
    await assertRegularInput(inputPath)
    validateIterations(iterations)
    const header = Buffer.concat([MAGIC, Buffer.alloc(4), randomBytes(16), randomBytes(12)])
    header.writeUInt32BE(iterations, 8)
    const key = await deriveKey(passwordFile, header.subarray(12, 28), iterations)
    try {
        const cipher = createCipheriv('aes-256-gcm', key, header.subarray(28), { authTagLength: TAG_BYTES })
        cipher.setAAD(header)
        // Exclusive creation prevents overwriting or deleting a pre-existing file.
        await writeFile(outputPath, header, { flag: 'wx', mode: 0o600 })
        try {
            await pipeline(createReadStream(inputPath), cipher, createWriteStream(outputPath, { flags: 'a' }))
            await appendFile(outputPath, cipher.getAuthTag())
        } catch (error) {
            await unlink(outputPath).catch(() => {})
            throw error
        }
    } finally {
        key.fill(0)
    }
}

export async function decryptBackupFile({ inputPath, outputPath, passwordFile }) {
    const info = await assertRegularInput(inputPath)
    if (!Number.isSafeInteger(info.size) || info.size <= HEADER_BYTES + TAG_BYTES) {
        throw new Error('Backup archive is truncated or unsupported.')
    }
    const input = await open(inputPath, 'r')
    const header = Buffer.alloc(HEADER_BYTES)
    const tag = Buffer.alloc(TAG_BYTES)
    try {
        if ((await input.read(header, 0, header.length, 0)).bytesRead !== header.length
            || (await input.read(tag, 0, tag.length, info.size - TAG_BYTES)).bytesRead !== tag.length
            || !header.subarray(0, MAGIC.length).equals(MAGIC)) {
            throw new Error('Only authenticated ACHBKP01 archives are supported; legacy CBC is rejected.')
        }
    } finally {
        await input.close()
    }
    const iterations = validateIterations(header.readUInt32BE(8))
    const key = await deriveKey(passwordFile, header.subarray(12, 28), iterations)
    try {
        const decipher = createDecipheriv('aes-256-gcm', key, header.subarray(28), { authTagLength: TAG_BYTES })
        decipher.setAAD(header)
        decipher.setAuthTag(tag)
        await writeFile(outputPath, Buffer.alloc(0), { flag: 'wx', mode: 0o600 })
        try {
            // Output is staging only. The caller may use it only after pipeline/final succeeds.
            await pipeline(createReadStream(inputPath, { start: HEADER_BYTES, end: info.size - TAG_BYTES - 1 }), decipher, createWriteStream(outputPath, { flags: 'w' }))
        } catch (error) {
            await unlink(outputPath).catch(() => {})
            throw error
        }
    } finally {
        key.fill(0)
    }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const [operation, inputPath, outputPath] = process.argv.slice(2)
    try {
        if (!['encrypt', 'decrypt'].includes(operation) || !inputPath || !outputPath || process.argv.length !== 5) {
            throw new Error('Invalid backup crypto command.')
        }
        const options = { inputPath, outputPath, passwordFile: process.env.BACKUP_ENCRYPTION_PASSWORD_FILE }
        if (operation === 'encrypt') {
            await encryptBackupFile({ ...options, iterations: Number(process.env.BACKUP_ENCRYPTION_ITERATIONS ?? 600_000) })
        } else {
            await decryptBackupFile(options)
        }
    } catch {
        // Do not expose keys, paths, SQL or underlying cryptographic diagnostics.
        console.error('Backup encryption/authentication failed. Only authenticated ACHBKP01 archives are supported.')
        process.exitCode = 65
    }
}
