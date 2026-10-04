import { IsNull } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import { AutoCareChatThreadEntity, AutoCareChatBlockEntity, AutoCareChatBlockStatus } from '../../entities/index.js'
import { UserEntity, UserRole } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { normalizeAutoCareChatBlockInput } from './chat-moderation-policy.js'
import { normalizeAutoCareChatUuid } from './chat-input-policy.js'
import { assertThreadAccess, chatParticipantIds, getThread, lockThreadForMutation } from './chat-access.service.js'
import { fail } from './chat-errors.js'
import { blockResponse } from './chat-moderation-response.js'

export async function createAutoCareChatBlock(user: UserEntity, chatId: string, blockedUserId?: string, reason?: string | null) {
    const normalizedInput = normalizeAutoCareChatBlockInput(blockedUserId, reason)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat block is invalid.' })
    if (user.role === UserRole.Admin || user.role === UserRole.SuperAdmin) fail(403, 'Administrators must apply chat blocks through a moderation decision.')
    const thread = await getThread(user, chatId)
    const block = await AppDataSource.transaction(async (manager) => {
        const lockedThread = await lockThreadForMutation(manager, thread)
        await assertThreadAccess(user, lockedThread)
        const participants = await chatParticipantIds(lockedThread)
        const target = normalizedInput.blockedUserId ?? [...participants].find((id) => id !== user.id)
        if (!target || target === user.id || !participants.has(target)) fail(400, 'The blocked user must be another chat participant.')
        const blocks = manager.getRepository(AutoCareChatBlockEntity)
        const existing = await blocks.findOneBy({ threadId: lockedThread.id, blockerId: user.id, blockedUserId: target, status: AutoCareChatBlockStatus.Active, sourceReportId: IsNull() })
        return existing ?? blocks.save(blocks.create({ threadId: lockedThread.id, blockerId: user.id, blockedUserId: target, status: AutoCareChatBlockStatus.Active, reason: normalizedInput.reason, sourceReportId: null, expiresAt: null, revokedAt: null }))
    })
    return blockResponse(block)
}

export async function revokeAutoCareChatBlock(user: UserEntity, chatId: string, blockId: string) {
    const normalizedChatId = normalizeAutoCareChatUuid(chatId)
    const normalizedBlockId = normalizeAutoCareChatUuid(blockId)
    if (!normalizedChatId || !normalizedBlockId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat and block ids must be valid UUIDs.' })
    const thread = await AppDataSource.getRepository(AutoCareChatThreadEntity).findOneBy({ id: normalizedChatId })
    if (!thread) fail(404, 'Chat not found.')
    const block = await AppDataSource.transaction(async (manager) => {
        const lockedThread = await lockThreadForMutation(manager, thread)
        const blocks = manager.getRepository(AutoCareChatBlockEntity)
        const block = await blocks.findOneBy({ id: normalizedBlockId, threadId: lockedThread.id })
        if (!block) fail(404, 'Chat block not found.')
        if (user.role === UserRole.Admin) fail(403, 'Only a super administrator can override a moderation block.')
        if (user.role !== UserRole.SuperAdmin && block.blockerId !== user.id) fail(403, 'You can only revoke your own chat block.')
        block.status = AutoCareChatBlockStatus.Revoked
        block.revokedAt = new Date()
        return blocks.save(block)
    })
    return blockResponse(block)
}
