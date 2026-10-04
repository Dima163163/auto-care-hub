import { type UserEntity } from '../../entities/user/user.entity.js'
import { assertAutoCareProviderLogoFileName, readAutoCareProviderLogo, saveAutoCareProviderLogo as persistAutoCareProviderLogo } from './autocare-provider-logo-storage.js'
import { saveAutoCareProviderMedia as persistAutoCareProviderMedia, type AutoCareProviderMediaKind } from './autocare-provider-media-storage.js'
import { assertOwner } from './provider-guards.js'

export async function getAutoCareProviderLogo(fileName: string) {
    assertAutoCareProviderLogoFileName(fileName)
    return readAutoCareProviderLogo(fileName)
}

export async function saveAutoCareProviderLogo(_owner: UserEntity, content: Buffer) {
    assertOwner(_owner)
    return { url: await persistAutoCareProviderLogo(content) }
}

export async function saveAutoCareProviderMedia(owner: UserEntity, kind: AutoCareProviderMediaKind, content: Buffer) {
    assertOwner(owner)
    return { url: await persistAutoCareProviderMedia(kind, content) }
}
