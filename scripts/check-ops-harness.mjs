import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const requiredFiles = [
  'server/scripts/backup.sh',
  'server/scripts/restore.sh',
  'docs/operations/alerts.example.yml',
  'docs/operations/BACKUP_RESTORE_RUNBOOK.md',
]
const requiredFragments = {
  'server/scripts/backup.sh': ['openssl enc -aes-256-cbc', 'shasum -a 256', 'BACKUP_ENCRYPTION_PASSWORD_FILE'],
  'server/scripts/restore.sh': ['shasum -a 256 -c', 'ALLOW_SAME_DATABASE_RESTORE', '--set ON_ERROR_STOP=1'],
  'docs/operations/alerts.example.yml': ['AutoCareApiUnavailable', 'AutoCareOutboxDeadLetter', 'AutoCareBackupExpired'],
}

for (const relativePath of requiredFiles) {
  const content = await readFile(resolve(root, relativePath), 'utf8')
  for (const fragment of requiredFragments[relativePath] ?? []) {
    if (!content.includes(fragment)) throw new Error(`${relativePath} is missing required ops control: ${fragment}`)
  }
}

console.info(`Ops harness controls verified: ${requiredFiles.length} files.`)
