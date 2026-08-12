import { useParams } from 'react-router'

import { useGetOwnerCabinetByIdQuery } from '@/entities/cabinet'

import { OwnerCabinetEditForm } from './OwnerCabinetEditForm'
import { OwnerCabinetEditHeader } from './OwnerCabinetEditHeader'
import { OwnerCabinetEditLoading } from './OwnerCabinetEditLoading'
import { OwnerCabinetEditNotFound } from './OwnerCabinetEditNotFound'

export const OwnerCabinetEditPage = () => {
    const { id } = useParams()

    const {
        data: cabinet,
        isLoading: isCabinetLoading,
        isError: isCabinetError,
    } = useGetOwnerCabinetByIdQuery(id ?? '', {
        skip: !id,
    })

    if (isCabinetLoading) {
        return <OwnerCabinetEditLoading />
    }

    if (isCabinetError || !cabinet) {
        return <OwnerCabinetEditNotFound />
    }

    return (
        <section className="space-y-6 px-4 py-8 lg:px-8">
            <OwnerCabinetEditHeader />
            <OwnerCabinetEditForm cabinet={cabinet} />
        </section>
    )
}
