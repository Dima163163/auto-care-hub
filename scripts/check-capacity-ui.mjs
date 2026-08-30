import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const projectRoot = resolve(new URL('..', import.meta.url).pathname)
const calendarSource = await readFile(resolve(projectRoot, 'src/pages/owner-autocare-requests/ui/OwnerCapacityCalendar.tsx'), 'utf8')
const requestsPageSource = await readFile(resolve(projectRoot, 'src/pages/owner-autocare-requests/ui/OwnerAutoCareRequestsPage.tsx'), 'utf8')
const resourcesSource = await readFile(resolve(projectRoot, 'src/pages/owner-autocare-requests/ui/OwnerCapacityResourcesPanel.tsx'), 'utf8')

const compactCalendarControls = [
    ['calendar test id', /data-testid="owner-capacity-calendar"/],
    ['compact calendar title', /Календарь филиала|Branch calendar/],
    ['branch appointment summary', /подтверждённых записей|confirmed appointments/],
    ['branch occupancy', /appointmentCapacity/],
]
const resourceControls = [
    ['resource query', /useGetOwnerAutoCareCapacityResourcesQuery/],
    ['reservation query', /useGetOwnerAutoCareCapacityReservationsQuery/],
    ['empty resource state', /Ресурсы ещё не добавлены|No resources yet/],
    ['resource creation form', /onSubmit=\{\(event\) => void addResource\(event\)\}/],
    ['resource creation mutation', /useCreateOwnerAutoCareCapacityResourceMutation/],
    ['resource mutation error state', /createState\.error/],
    ['resource query error state', /resources\.isError/],
    ['reservation query error state', /reservations\.isError/],
    ['refreshing occupancy state', /reservations\.isFetching/],
]

const missingCalendar = compactCalendarControls.filter(([, pattern]) => !pattern.test(calendarSource)).map(([name]) => name)
if (missingCalendar.length > 0) throw new Error(`Compact capacity calendar is missing: ${missingCalendar.join(', ')}`)

if (/OwnerCapacityResourcesPanel|useGetOwnerAutoCareCapacity|useCreateOwnerAutoCareCapacity|useUpdateOwnerAutoCareCapacity/.test(calendarSource)) {
    throw new Error('Compact capacity calendar must not mount the post-MVP resource panel or resource queries')
}

if (!/\{!query\.error && <OwnerCapacityCalendar requests=\{requests\}/.test(requestsPageSource)) {
    throw new Error('Owner requests page must keep the compact calendar visible while requests are loading')
}

if (!/loading=\{query\.isLoading\}/.test(requestsPageSource) || !/aria-busy=\{loading\}/.test(requestsPageSource)) {
    throw new Error('Owner request summary cards must expose themed loading placeholders instead of zero values')
}

const missingResources = resourceControls.filter(([, pattern]) => !pattern.test(resourcesSource)).map(([name]) => name)
if (missingResources.length > 0) throw new Error(`Post-MVP resource panel is missing: ${missingResources.join(', ')}`)

if (/if\s*\(\s*!resources\.data\?\.length\s*\)\s*return\s+null/.test(resourcesSource)) {
    throw new Error('Post-MVP resource panel hides its create form when a branch has no resources')
}

if (!/const resourceList = resources\.data \?\? \[\]/.test(resourcesSource)) {
    throw new Error('Post-MVP resource panel must normalize an empty resource response before rendering')
}

console.info('Capacity UI contract passed (compact branch calendar; resources isolated for post-MVP).')
