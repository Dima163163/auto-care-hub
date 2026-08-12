import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'

export function OwnerCabinetCreateHeader() {
    const { t } = useTranslation()

    return (
        <PageHeader
            eyebrow={t('workspace.owner')}
            title={t('cabinet.form.createTitle')}
            description={t('cabinet.form.createDescription')}
        />
    )
}
