import type { Cabinet } from '@/entities/cabinet'

import { CabinetDetailsSummary } from './CabinetDetailsSummary'
import { CabinetLocationPreview } from './CabinetLocationPreview'

type CabinetDetailsSidebarProps = {
    cabinet: Cabinet
}

export function CabinetDetailsSidebar({ cabinet }: CabinetDetailsSidebarProps) {
    return (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.18fr)_minmax(280px,0.82fr)] sm:items-start">
            <CabinetDetailsSummary cabinet={cabinet} />
            <CabinetLocationPreview cabinet={cabinet} />
        </div>
    )
}
