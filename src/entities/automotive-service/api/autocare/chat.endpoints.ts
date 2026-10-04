import { z } from 'zod'
import { autoCareChatBlockSchema, autoCareChatConversationSchema, autoCareChatReportPageSchema, autoCareChatReportSchema, autoCareChatThreadSchema, autoCareChatThreadsSchema } from './chat.schemas'
import type { AdminAutoCareChatReportQuery, AssignAutoCareChatReportInput, AutoCareChatBlock, AutoCareChatConversation, AutoCareChatReport, AutoCareChatReportListQuery, AutoCareChatReportPage, AutoCareChatThread, CreateAutoCareChatAttachmentInput, CreateAutoCareChatBlockInput, CreateAutoCareChatInput, CreateAutoCareChatMessageInput, CreateAutoCareChatReportInput, DecideAutoCareChatReportInput, DeleteAutoCareChatMessageResponse, ExtendAutoCareChatReportAccessInput, RevokeAutoCareChatBlockInput } from './chat.types'
import { updatedCountSchema } from './common.schemas'
import { autoCareServiceAttachmentSchema, autoCareServiceMessageSchema } from './requests.schemas'
import type { AutoCareServiceAttachment, AutoCareServiceMessage } from './requests.types'
import type { AutoCareEndpointBuilder } from './endpoint-builder'

export function createChatEndpoints(build: AutoCareEndpointBuilder) {
    return {
getAdminAutoCareChatReports: build.query<AutoCareChatReportPage, AdminAutoCareChatReportQuery | void>({
            query: (params) => ({ url: '/admin/chat-reports', params: params ?? undefined }),
            transformResponse: (value: unknown) => autoCareChatReportPageSchema.parse(value),
            providesTags: [{ type: 'AutoCareServiceRequest', id: 'CHAT_REPORTS' }],
        }),
decideAdminAutoCareChatReport: build.mutation<AutoCareChatReport, DecideAutoCareChatReportInput>({
            query: ({ id, ...body }) => ({ url: `/admin/chat-reports/${encodeURIComponent(id)}/decision`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareChatReportSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareServiceRequest', id: 'CHAT_REPORTS' }],
        }),
assignAdminAutoCareChatReport: build.mutation<AutoCareChatReport, AssignAutoCareChatReportInput>({
            query: ({ id, ...body }) => ({ url: `/admin/chat-reports/${encodeURIComponent(id)}/assignment`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareChatReportSchema.parse(value),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'AutoCareServiceRequest', id: 'CHAT_REPORTS' }, { type: 'AutoCareServiceRequest', id: `CHAT_REPORT_${id}` }],
        }),
extendAdminAutoCareChatReportAccess: build.mutation<AutoCareChatReport, ExtendAutoCareChatReportAccessInput>({
            query: ({ id, ...body }) => ({ url: `/admin/chat-reports/${encodeURIComponent(id)}/assignment/extend`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareChatReportSchema.parse(value),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'AutoCareServiceRequest', id: 'CHAT_REPORTS' }, { type: 'AutoCareServiceRequest', id: `CHAT_REPORT_${id}` }],
        }),
getAutoCareChats: build.query<AutoCareChatThread[], void>({
            query: () => '/v1/chats',
            transformResponse: (value: unknown) => autoCareChatThreadsSchema.parse(value),
            providesTags: [{ type: 'AutoCareServiceRequest', id: 'CHAT_LIST' }],
        }),
getAutoCareRequestChatThread: build.query<AutoCareChatThread, string>({
            query: (requestId) => `/v1/service-requests/${encodeURIComponent(requestId)}/chat-thread`,
            transformResponse: (value: unknown) => autoCareChatThreadSchema.parse(value),
            providesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: `REQUEST_CHAT_${requestId}` }],
        }),
createAutoCareChat: build.mutation<AutoCareChatThread, CreateAutoCareChatInput>({
            query: (body) => ({ url: '/v1/chats', method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareChatThreadSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareServiceRequest', id: 'CHAT_LIST' }],
        }),
getAutoCareChat: build.query<AutoCareChatConversation, string | { chatId: string; cursor?: string; beforeCursor?: string; limit?: number; emergencyReason?: string }>({
            query: (input) => {
                const chatId = typeof input === 'string' ? input : input.chatId
                const query = typeof input === 'string' ? '' : new URLSearchParams({ ...(input.cursor ? { cursor: input.cursor } : {}), ...(input.beforeCursor ? { beforeCursor: input.beforeCursor } : {}), ...(input.limit ? { limit: String(input.limit) } : {}), ...(input.emergencyReason ? { emergencyReason: input.emergencyReason } : {}) }).toString()
                return `/v1/chats/${chatId}${query ? `?${query}` : ''}`
            },
            transformResponse: (value: unknown) => autoCareChatConversationSchema.parse(value),
            providesTags: (_result, _error, input) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${typeof input === 'string' ? input : input.chatId}` }],
        }),
createAutoCareChatMessage: build.mutation<AutoCareServiceMessage, CreateAutoCareChatMessageInput>({
            query: ({ chatId, body, idempotencyKey }) => ({ url: `/v1/chats/${chatId}/messages`, method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: { body } }),
            transformResponse: (value: unknown) => autoCareServiceMessageSchema.parse(value),
            invalidatesTags: (_result, _error, { chatId }) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${chatId}` }, { type: 'AutoCareServiceRequest', id: 'CHAT_LIST' }],
        }),
createAutoCareChatReport: build.mutation<AutoCareChatReport, CreateAutoCareChatReportInput>({
            query: ({ chatId, ...body }) => ({ url: `/v1/chats/${chatId}/reports`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareChatReportSchema.parse(value),
            invalidatesTags: (_result, _error, { chatId }) => [{ type: 'AutoCareServiceRequest', id: 'CHAT_REPORTS' }, { type: 'AutoCareServiceRequest', id: `CHAT_${chatId}` }, { type: 'AutoCareServiceRequest', id: `CHAT_REPORTS_MINE_${chatId}` }],
        }),
getMyAutoCareChatReports: build.query<AutoCareChatReportPage, { chatId: string } & AutoCareChatReportListQuery>({
            query: ({ chatId, ...params }) => ({ url: `/v1/chats/${encodeURIComponent(chatId)}/reports/mine`, params }),
            transformResponse: (value: unknown) => autoCareChatReportPageSchema.parse(value),
            providesTags: (_result, _error, { chatId }) => [{ type: 'AutoCareServiceRequest', id: `CHAT_REPORTS_MINE_${chatId}` }],
        }),
deleteAutoCareChatMessage: build.mutation<DeleteAutoCareChatMessageResponse, { chatId: string; messageId: string }>({
            query: ({ chatId, messageId }) => ({ url: `/v1/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`, method: 'DELETE' }),
            transformResponse: (value: unknown) => z.object({ id: z.string(), deletedAt: z.string() }).parse(value),
            invalidatesTags: (_result, _error, { chatId }) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${chatId}` }, { type: 'AutoCareServiceRequest', id: 'CHAT_LIST' }],
        }),
createAutoCareChatBlock: build.mutation<AutoCareChatBlock, CreateAutoCareChatBlockInput>({
            query: ({ chatId, ...body }) => ({ url: `/v1/chats/${chatId}/blocks`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareChatBlockSchema.parse(value),
            invalidatesTags: (_result, _error, { chatId }) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${chatId}` }],
        }),
revokeAutoCareChatBlock: build.mutation<AutoCareChatBlock, RevokeAutoCareChatBlockInput>({
            query: ({ chatId, blockId }) => ({ url: `/v1/chats/${chatId}/blocks/${blockId}`, method: 'DELETE' }),
            transformResponse: (value: unknown) => autoCareChatBlockSchema.parse(value),
            invalidatesTags: (_result, _error, { chatId }) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${chatId}` }],
        }),
markAutoCareChatRead: build.mutation<{ updated: number }, string>({
            query: (chatId) => ({ url: `/v1/chats/${chatId}/read`, method: 'POST' }),
            transformResponse: (value: unknown) => updatedCountSchema.parse(value),
            invalidatesTags: (_result, _error, chatId) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${chatId}` }, { type: 'AutoCareServiceRequest', id: 'CHAT_LIST' }],
        }),
createAutoCareChatAttachment: build.mutation<AutoCareServiceAttachment, CreateAutoCareChatAttachmentInput>({
            query: ({ chatId, ...body }) => ({ url: `/v1/chats/${chatId}/attachments`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareServiceAttachmentSchema.parse(value),
            invalidatesTags: (_result, _error, { chatId }) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${chatId}` }],
        })
    }
}
