import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

type OwnerCabinetEditFormActionsProps = {
    isSaving: boolean
    isUploadingImage: boolean
}

export function OwnerCabinetEditFormActions({
    isSaving,
    isUploadingImage,
}: OwnerCabinetEditFormActionsProps) {
    const { t } = useTranslation()

    return (
        <div className="mt-6 flex flex-wrap gap-3">
            <Button type="submit" loading={isSaving || isUploadingImage}>
                {isUploadingImage
                    ? t('cabinet.form.uploadingImage')
                    : isSaving
                    ? t('cabinet.form.savingAction')
                    : t('cabinet.form.saveAction')}
            </Button>

            <Link
                to={ROUTES.ownerCabinets}
                className={buttonVariants({ variant: 'outline' })}
            >
                {t('common.cancel')}
            </Link>
        </div>
    )
}
