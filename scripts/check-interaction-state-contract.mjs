import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const requiredFragments = [
  ['src/components/ui/button.tsx', 'loading?: boolean'],
  ['src/components/ui/button.tsx', 'aria-busy={loading || undefined}'],
  ['src/components/ui/button.tsx', 'data-slot="button-loading-indicator"'],
  ['src/components/ui/floating-input.tsx', 'aria-[invalid=true]:border-status-danger-border'],
  ['src/shared/ui/filter-controls/FilterControls.tsx', 'aria-[invalid=true]:border-status-danger-border'],
  ['src/shared/ui/state-card/StateCard.tsx', 'aria-busy={isLoading || undefined}'],
  ['src/shared/ui/query-refresh-error/QueryRefreshError.tsx', 'loading={isRetrying}'],
  ['src/shared/ui/query-refresh-error/QueryRefreshError.tsx', 'data-retrying={isRetrying || undefined}'],
  ['src/shared/ui/dialog/Dialog.tsx', 'aria-describedby={descriptionCount > 0 ? descriptionId : undefined}'],
  ['src/shared/ui/dialog/Dialog.tsx', "if (event.key === 'Escape')"],
  ['src/pages/security-center/ui/SecurityCenterPage.tsx', 'max-md:z-[1100]'],
  ['src/pages/security-center/ui/SecurityCenterPage.tsx', 'max-md:pb-[calc(1.25rem+var(--mobile-nav-height)+env(safe-area-inset-bottom))]'],
  ['src/pages/security-center/ui/SecurityCenterPage.tsx', 'fixed inset-0 z-[1050]'],
  ['src/pages/autocare-home/ui/AutoCareSearchForm.tsx', "tab === 'service' ? 'rounded-tl-[10px]' : 'rounded-tr-[10px]'"],
  ['src/shared/ui/boot-shell/BootShell.tsx', 'rounded-tl-[10px]'],
  ['src/shared/ui/boot-shell/BootShell.tsx', 'rounded-tr-[10px]'],
]

const missing = requiredFragments.filter(([relativePath, fragment]) => {
  const file = fs.readFileSync(path.join(root, relativePath), 'utf8')
  return !file.includes(fragment)
})

if (missing.length > 0) {
  console.error('Interaction-state contract failed:')
  for (const [relativePath, fragment] of missing) {
    console.error(`- ${relativePath}: missing ${fragment}`)
  }
  process.exit(1)
}

console.log(`Interaction-state contract passed (${requiredFragments.length} invariants).`)
