import { OwnerCabinetCreateForm } from './OwnerCabinetCreateForm'
import { OwnerCabinetCreateHeader } from './OwnerCabinetCreateHeader'

export function OwnerCabinetCreatePage() {
    return(
        <main className="min-h-screen bg-background px-4 py-8 lg:px-8">
            <section className="mx-auto max-w-3xl">
                <OwnerCabinetCreateHeader />
                <OwnerCabinetCreateForm />
            </section>
        </main>
    )
}
