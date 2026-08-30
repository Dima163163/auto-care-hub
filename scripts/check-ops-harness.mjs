import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const requiredFiles = [
  'server/scripts/backup.sh',
  'server/scripts/restore.sh',
  'docs/operations/alerts.example.yml',
  'docs/operations/BACKUP_RESTORE_RUNBOOK.md',
  'docs/operations/BACKUP_RESTORE_EVIDENCE_TEMPLATE.md',
]
const requiredFragments = {
  'server/scripts/backup.sh': ['umask 077', 'RUN_SUFFIX=', 'BACKUP_ENCRYPTION_PASSWORD_FILE', '.autocare-backup-directory', 'mv "$STAGED_BACKUP_FILE" "$BACKUP_FILE"', 'cd "$BACKUP_DIR"', 'basename "$BACKUP_FILE"', 'shasum -a 256'],
  'server/scripts/restore.sh': ['umask 077', 'BACKUP_DIRECTORY=', 'CHECKSUM_BASENAME=', 'cd "$BACKUP_DIRECTORY"', 'shasum -a 256 -c', 'ALLOW_SAME_DATABASE_RESTORE', '--set ON_ERROR_STOP=1', '--single-transaction'],
  'docs/operations/alerts.example.yml': ['AutoCareApiUnavailable', 'AutoCareOutboxDeadLetter', 'AutoCareBackupExpired'],
  'docs/operations/BACKUP_RESTORE_EVIDENCE_TEMPLATE.md': ['RPO', 'RTO', 'checksum', 'Isolated restore target'],
}

for (const relativePath of requiredFiles) {
  const content = await readFile(resolve(root, relativePath), 'utf8')
  for (const fragment of requiredFragments[relativePath] ?? []) {
    if (!content.includes(fragment)) throw new Error(`${relativePath} is missing required ops control: ${fragment}`)
  }
}

console.info(`Ops harness controls verified: ${requiredFiles.length} files.`)
