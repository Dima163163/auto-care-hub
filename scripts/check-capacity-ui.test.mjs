import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const calendarSource = await readFile(resolve(projectRoot, 'src/pages/owner-autocare-requests/ui/OwnerCapacityCalendar.tsx'), 'utf8')
const requestsPageSource = await readFile(resolve(projectRoot, 'src/pages/owner-autocare-requests/ui/OwnerAutoCareRequestsPage.tsx'), 'utf8')
const resourcesSource = await readFile(resolve(projectRoot, 'src/pages/owner-autocare-requests/ui/OwnerCapacityResourcesPanel.tsx'), 'utf8')

test('capacity contract keeps the owner screen compact', () => {
    if (!calendarSource.includes('data-testid="owner-capacity-calendar"')) throw new Error('compact calendar test id is missing')
    if (!/Календарь филиала|Branch calendar/.test(calendarSource)) throw new Error('compact calendar title is missing')
    if (/OwnerCapacityResourcesPanel|useGetOwnerAutoCareCapacityResourcesQuery/.test(calendarSource)) throw new Error('resource panel leaked into the compact calendar')
    if (!/\{!query\.error && <OwnerCapacityCalendar requests=\{requests\}/.test(requestsPageSource)) throw new Error('compact calendar disappears while owner requests are loading')
    if (!/loading=\{query\.isLoading\}/.test(requestsPageSource) || !/aria-busy=\{loading\}/.test(requestsPageSource)) throw new Error('summary cards render zero values during loading')
})

test('capacity contract keeps detailed resources isolated for post-MVP', () => {
    if (!resourcesSource.includes('No resources yet')) throw new Error('empty resource copy is not guarded')
    if (!resourcesSource.includes('onSubmit={(event) => void addResource(event)}')) throw new Error('resource creation form is not guarded')
    if (!resourcesSource.includes('const resourceList = resources.data ?? []')) throw new Error('empty response normalization is not guarded')
    if (!resourcesSource.includes('data-testid="owner-capacity-resources"')) throw new Error('post-MVP resource panel marker is missing')
    if (/if\s*\(\s*!resources\.data\?\.length\s*\)\s*return\s+null/.test(resourcesSource)) throw new Error('resource panel hides the create form for an empty branch')
})
