// Preserve registration precedence across domain handlers sharing one fixture state.
import { authHandlers } from './autocare/auth.handlers'
import { accountHandlers } from './autocare/account.handlers'
import { communityHandlers } from './autocare/community.handlers'
import { notificationsHandlers } from './autocare/notifications.handlers'
import { legacyWorkspaceHandlers } from './autocare/legacy-workspace.handlers'
import { operationsHandlers } from './autocare/operations.handlers'
import { catalogHandlers } from './autocare/catalog.handlers'
import { bonusesHandlers } from './autocare/bonuses.handlers'
import { providersHandlers } from './autocare/providers.handlers'
import { marketplaceHandlers } from './autocare/marketplace.handlers'
import { reviewsHandlers } from './autocare/reviews.handlers'
import { requestsHandlers } from './autocare/requests.handlers'
import { chatHandlers } from './autocare/chat.handlers'
import { resourcesHandlers } from './autocare/resources.handlers'
import { workspaceHandlers } from './autocare/workspace.handlers'
import { legacyBookingsHandlers } from './autocare/legacy-bookings.handlers'
import { governanceHandlers } from './autocare/governance.handlers'
import { chatModerationHandlers } from './autocare/chat-moderation.handlers'

export const handlers = [
    ...authHandlers,
    ...accountHandlers,
    ...communityHandlers,
    ...notificationsHandlers,
    ...legacyWorkspaceHandlers,
    ...operationsHandlers,
    ...catalogHandlers,
    ...bonusesHandlers,
    ...providersHandlers,
    ...marketplaceHandlers,
    ...reviewsHandlers,
    ...requestsHandlers,
    ...chatHandlers,
    ...resourcesHandlers,
    ...workspaceHandlers,
    ...legacyBookingsHandlers,
    ...governanceHandlers,
    ...chatModerationHandlers,
].sort((left, right) => left.order - right.order).map(({ handler }) => handler)
