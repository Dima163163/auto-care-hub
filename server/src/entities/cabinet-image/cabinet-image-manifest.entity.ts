import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

import type { StoredCabinetImageManifest } from '../../modules/cabinets/cabinet-image-manifest.js'

@Entity('cabinet_image_manifests')
export class CabinetImageManifestEntity {
    @PrimaryColumn({ name: 'original_key', type: 'text' })
    originalKey!: string

    @Column({ type: 'text' })
    version!: string

    @Column({ type: 'jsonb' })
    manifest!: StoredCabinetImageManifest

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date
}
