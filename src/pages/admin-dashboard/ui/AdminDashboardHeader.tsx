import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'

export function AdminDashboardHeader() {
    const { t } = useTranslation()

    return (
        <PageHeader
            eyebrow={t('workspace.admin')}
            title={t('adminDashboard.title')}
            description={t('adminDashboard.description')}
        />
    )
}
