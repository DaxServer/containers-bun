import { config } from '@backend/config'
import { encryptAccessToken } from '@backend/core/crypto'
import { createSessionPlugin } from '@backend/core/session'
import * as batchesDal from '@backend/db/dal/batches'
import * as presetsDal from '@backend/db/dal/presets'
import * as uploadsDal from '@backend/db/dal/uploads'
import * as usersDal from '@backend/db/dal/users'
import Elysia, { t } from 'elysia'

const _noopStore = {
  async get(_k: string): Promise<null> {
    return null
  },
  async set(_k: string, _v: string, _ex: 'EX', _ttl: number): Promise<void> {},
  async del(_k: string): Promise<void> {},
}

const requireAdmin = new Elysia({ name: 'require-admin' })
  .use(createSessionPlugin(_noopStore))
  .derive({ as: 'scoped' }, ({ session }) => {
    if (!session.user) {
      throw new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (session.user.username !== config.xUsername) {
      throw new Response(JSON.stringify({ message: 'Forbidden' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      })
    }
    return { user: session.user }
  })

type AdminDal = {
  users: typeof usersDal
  batches: typeof batchesDal
  presets: typeof presetsDal
  uploads: typeof uploadsDal
}

export function createAdminRoutes(dal: AdminDal) {
  return new Elysia({ prefix: '/api/admin' })
    .use(requireAdmin)

    .get(
      '/batches',
      async ({ query }) => {
        const offset = ((query.page ?? 1) - 1) * (query.limit ?? 100)
        const [items, total] = await Promise.all([
          dal.batches.getBatches({
            offset,
            limit: query.limit ?? 100,
            filterText: query.filter_text,
          }),
          dal.batches.countBatches({ filterText: query.filter_text }),
        ])
        return { items, total }
      },
      {
        query: t.Object({
          page: t.Optional(t.Numeric()),
          limit: t.Optional(t.Numeric()),
          filter_text: t.Optional(t.String()),
        }),
      },
    )

    .get(
      '/users',
      async ({ query }) => {
        const offset = ((query.page ?? 1) - 1) * (query.limit ?? 100)
        const [items, total] = await Promise.all([
          dal.users.getUsers({ offset, limit: query.limit ?? 100, filterText: query.filter_text }),
          dal.users.countUsers({ filterText: query.filter_text }),
        ])
        return { items, total }
      },
      {
        query: t.Object({
          page: t.Optional(t.Numeric()),
          limit: t.Optional(t.Numeric()),
          filter_text: t.Optional(t.String()),
        }),
      },
    )

    .get(
      '/upload_requests',
      async ({ query }) => {
        const offset = ((query.page ?? 1) - 1) * (query.limit ?? 100)
        const statuses = query.status
          ? Array.isArray(query.status)
            ? query.status
            : [query.status]
          : undefined
        const dateFrom = query.date_from ? new Date(query.date_from) : undefined
        const dateTo = query.date_to ? new Date(query.date_to) : undefined
        const [items, total] = await Promise.all([
          dal.uploads.getAllUploadRequests({
            offset,
            limit: query.limit ?? 100,
            filterText: query.filter_text,
            statuses,
            dateFrom,
            dateTo,
          }),
          dal.uploads.countAllUploadRequests({
            filterText: query.filter_text,
            statuses,
            dateFrom,
            dateTo,
          }),
        ])
        return { items, total }
      },
      {
        query: t.Object({
          page: t.Optional(t.Numeric()),
          limit: t.Optional(t.Numeric()),
          filter_text: t.Optional(t.String()),
          status: t.Optional(t.Union([t.String(), t.Array(t.String())])),
          date_from: t.Optional(t.String()),
          date_to: t.Optional(t.String()),
        }),
      },
    )

    .post(
      '/upload_requests/bulk-cancel',
      async ({ body }) => {
        const cancelled_count = await dal.uploads.cancelUploadRequests(body.ids)
        return { cancelled_count }
      },
      {
        body: t.Object({ ids: t.Array(t.Number()) }),
      },
    )

    .post(
      '/upload_requests/bulk-fail',
      async ({ body }) => {
        const failed_count = await dal.uploads.failUploadRequests(body.ids)
        return { failed_count }
      },
      {
        body: t.Object({ ids: t.Array(t.Number()) }),
      },
    )

    .get(
      '/presets',
      async ({ query }) => {
        const offset = ((query.page ?? 1) - 1) * (query.limit ?? 100)
        const [items, total] = await Promise.all([
          dal.presets.getAllPresets({
            offset,
            limit: query.limit ?? 100,
            filterText: query.filter_text,
          }),
          dal.presets.countAllPresets({ filterText: query.filter_text }),
        ])
        return { items, total }
      },
      {
        query: t.Object({
          page: t.Optional(t.Numeric()),
          limit: t.Optional(t.Numeric()),
          filter_text: t.Optional(t.String()),
        }),
      },
    )

    .get(
      '/failed_uploads',
      async ({ query }) => {
        const offset = ((query.page ?? 1) - 1) * (query.limit ?? 50)
        return dal.uploads.getFailedUploadsGrouped({
          offset,
          limit: query.limit ?? 50,
          sortBy: query.sort_by as 'recent' | 'batchSize' | 'errorType' | 'user' | undefined,
          errorType: query.error_type,
          handler: query.handler,
          searchText: query.search_text,
        })
      },
      {
        query: t.Object({
          page: t.Optional(t.Numeric()),
          limit: t.Optional(t.Numeric()),
          sort_by: t.Optional(t.String()),
          error_type: t.Optional(t.String()),
          handler: t.Optional(t.String()),
          search_text: t.Optional(t.String()),
        }),
      },
    )

    .put(
      '/upload_requests/:id',
      async ({ params, body, set }) => {
        const ok = await dal.uploads.updateUploadFields(Number(params.id), body)
        if (!ok) {
          set.status = 404
          return { message: 'Not found' }
        }
        return { message: 'Upload request updated successfully' }
      },
      {
        body: t.Object({
          status: t.Optional(t.String()),
          error: t.Optional(t.Any()),
        }),
      },
    )

    .post(
      '/retry',
      async ({ body, session, set }) => {
        const tokenPair = session.access_token
        if (!tokenPair) {
          set.status = 401
          return { message: 'No access token in session' }
        }
        const encryptedToken = encryptAccessToken(tokenPair)
        const { newUploadIds, newBatchId } = await dal.uploads.retrySelectedUploadsToNewBatch(
          body.upload_ids,
          encryptedToken,
          session.user!.sub,
          session.user!.username,
        )
        return {
          message: `Retrying ${newUploadIds.length} of ${body.upload_ids.length} requested uploads`,
          retried_count: newUploadIds.length,
          requested_count: body.upload_ids.length,
          new_batch_id: newBatchId,
        }
      },
      {
        body: t.Object({ upload_ids: t.Array(t.Number()) }),
      },
    )
}

export const adminRoutes = createAdminRoutes({
  users: usersDal,
  batches: batchesDal,
  presets: presetsDal,
  uploads: uploadsDal,
})
