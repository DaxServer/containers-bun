import { generateEditGroupId } from '@backend/core/crypto'
import { db } from '@backend/db/client'
import { batches, uploadRequests, users } from '@backend/db/schema'
import type { Handler, UploadItem, UploadStatus } from '@backend/types/ws'
import type { SQL } from 'drizzle-orm'
import { and, asc, count, desc, eq, gt, inArray, like, lt, or, sql } from 'drizzle-orm'

export type BatchUploadItem = {
  id: number
  batchid: number
  userid: string
  status: UploadStatus
  key: string
  handler: Handler
  collection: string | null
  filename: string
  wikitext: string
  copyright_override: boolean
  labels: unknown
  result: string | null
  error: unknown
  success: string | null
  celery_task_id: string | null
  created_at: string | null
  updated_at: string | null
  image_id: string
}

function toUploadItem(u: typeof uploadRequests.$inferSelect): BatchUploadItem {
  return {
    id: u.id,
    batchid: u.batchid,
    userid: u.userid,
    status: u.status as UploadStatus,
    key: u.key,
    handler: u.handler as Handler,
    collection: u.collection,
    filename: u.filename,
    wikitext: u.wikitext,
    copyright_override: u.copyright_override,
    labels: u.labels,
    result: u.result,
    error: u.error,
    success: u.success,
    celery_task_id: u.celery_task_id,
    created_at: u.created_at?.toISOString() ?? null,
    updated_at: u.updated_at?.toISOString() ?? null,
    image_id: u.key,
  }
}

function uploadFilter({
  filterText,
  statuses,
  dateFrom,
  dateTo,
}: {
  filterText?: string
  statuses?: string[]
  dateFrom?: Date
  dateTo?: Date
}) {
  const parts: SQL[] = []
  if (filterText) {
    const p = `%${filterText}%`
    parts.push(
      or(
        like(sql`CAST(${uploadRequests.id} AS CHAR)`, p),
        like(sql`CAST(${uploadRequests.batchid} AS CHAR)`, p),
        like(uploadRequests.userid, p),
        like(uploadRequests.filename, p),
        like(uploadRequests.status, p),
      ) as SQL,
    )
  }
  if (statuses && statuses.length > 0) parts.push(inArray(uploadRequests.status, statuses) as SQL)
  if (dateFrom) parts.push(gt(uploadRequests.created_at, dateFrom) as SQL)
  if (dateTo) {
    const end = new Date(dateTo)
    end.setDate(end.getDate() + 1)
    parts.push(lt(uploadRequests.created_at, end) as SQL)
  }
  return parts.length ? and(...parts) : undefined
}

export async function getAllUploadRequests({
  offset = 0,
  limit = 100,
  filterText,
  statuses,
  dateFrom,
  dateTo,
}: {
  offset?: number
  limit?: number
  filterText?: string
  statuses?: string[]
  dateFrom?: Date
  dateTo?: Date
} = {}): Promise<BatchUploadItem[]> {
  const rows = await db
    .select()
    .from(uploadRequests)
    .where(uploadFilter({ filterText, statuses, dateFrom, dateTo }))
    .orderBy(desc(uploadRequests.id))
    .limit(limit)
    .offset(offset)
  return rows.map(toUploadItem)
}

export async function countAllUploadRequests({
  filterText,
  statuses,
  dateFrom,
  dateTo,
}: {
  filterText?: string
  statuses?: string[]
  dateFrom?: Date
  dateTo?: Date
} = {}): Promise<number> {
  const [row] = await db
    .select({ n: count(uploadRequests.id) })
    .from(uploadRequests)
    .where(uploadFilter({ filterText, statuses, dateFrom, dateTo }))
  return row?.n ?? 0
}

export async function countActiveUploadsForUser(userid: string): Promise<number> {
  const [row] = await db
    .select({ n: count(uploadRequests.id) })
    .from(uploadRequests)
    .where(
      and(
        eq(uploadRequests.userid, userid),
        inArray(uploadRequests.status, ['queued', 'in_progress']),
      ),
    )
  return row?.n ?? 0
}

export async function cancelUploadRequests(ids: number[]): Promise<number> {
  const result = await db
    .update(uploadRequests)
    .set({ status: 'cancelled' })
    .where(
      and(
        inArray(uploadRequests.id, ids),
        inArray(uploadRequests.status, ['queued', 'in_progress']),
      ),
    )
  return (result[0] as { affectedRows: number }).affectedRows
}

export async function failUploadRequests(ids: number[]): Promise<number> {
  const result = await db
    .update(uploadRequests)
    .set({ status: 'failed', error: { message: 'Manually marked as failed' } })
    .where(and(inArray(uploadRequests.id, ids), sql`${uploadRequests.status} != 'failed'`))
  return (result[0] as { affectedRows: number }).affectedRows
}

export async function getUploadsByBatch(batchId: number): Promise<BatchUploadItem[]> {
  const rows = await db
    .select()
    .from(uploadRequests)
    .where(eq(uploadRequests.batchid, batchId))
    .orderBy(asc(uploadRequests.id))
  return rows.map(toUploadItem)
}

export async function getUploadById(
  uploadId: number,
): Promise<(typeof uploadRequests.$inferSelect & { user: typeof users.$inferSelect }) | null> {
  const result = await db.query.uploadRequests.findFirst({
    where: (u, { eq }) => eq(u.id, uploadId),
    with: { user: true },
  })
  return result ?? null
}

export async function updateUploadStatus(
  uploadId: number,
  status: string,
  error?: unknown,
  success?: string,
): Promise<void> {
  await db
    .update(uploadRequests)
    .set({ status, error: error ?? null, success: success ?? null })
    .where(eq(uploadRequests.id, uploadId))
}

export async function clearUploadAccessToken(uploadId: number): Promise<void> {
  await db.update(uploadRequests).set({ access_token: null }).where(eq(uploadRequests.id, uploadId))
}

export async function updateJobTaskId(uploadId: number, taskId: string): Promise<void> {
  await db
    .update(uploadRequests)
    .set({ celery_task_id: taskId })
    .where(eq(uploadRequests.id, uploadId))
}

export async function updateUploadFields(
  uploadId: number,
  fields: Record<string, string | number | boolean | null>,
): Promise<boolean> {
  const result = await db
    .update(uploadRequests)
    .set(fields as Partial<typeof uploadRequests.$inferInsert>)
    .where(eq(uploadRequests.id, uploadId))
  return (result[0] as { affectedRows: number }).affectedRows > 0
}

export async function cancelBatch(
  batchId: number,
  userid?: string,
): Promise<Map<number, string | null>> {
  const batch = await db.query.batches.findFirst({ where: (b, { eq }) => eq(b.id, batchId) })
  if (!batch) throw new Error(`Batch ${batchId} not found`)
  if (userid && batch.userid !== userid) throw new Error('Permission denied')
  const queued = await db
    .select({ id: uploadRequests.id, celery_task_id: uploadRequests.celery_task_id })
    .from(uploadRequests)
    .where(and(eq(uploadRequests.batchid, batchId), eq(uploadRequests.status, 'queued')))
  if (queued.length > 0) {
    await db
      .update(uploadRequests)
      .set({ status: 'cancelled' })
      .where(
        inArray(
          uploadRequests.id,
          queued.map((r) => r.id),
        ),
      )
  }
  const result = new Map<number, string | null>()
  for (const r of queued) result.set(r.id, r.celery_task_id)
  return result
}

export async function retrySelectedUploadsToNewBatch(
  uploadIds: number[],
  encryptedAccessToken: string,
  adminUserid: string,
  _adminUsername: string,
): Promise<{ newUploadIds: number[]; editGroupId: string | null; newBatchId: number }> {
  const originals = await db
    .select()
    .from(uploadRequests)
    .where(
      and(inArray(uploadRequests.id, uploadIds), sql`${uploadRequests.status} != 'in_progress'`),
    )
  if (originals.length === 0) return { newUploadIds: [], editGroupId: null, newBatchId: 0 }
  const editGroupId = generateEditGroupId()
  const batchResult = await db.insert(batches).values({
    userid: adminUserid,
    edit_group_id: editGroupId,
    created_at: sql`CURRENT_TIMESTAMP`,
    updated_at: sql`CURRENT_TIMESTAMP`,
  })
  const newBatchId = (batchResult[0] as { insertId: number }).insertId
  const newUploads = originals.map((u) => ({
    batchid: newBatchId,
    userid: adminUserid,
    status: 'queued' as const,
    key: u.key,
    handler: u.handler,
    collection: u.collection,
    access_token: encryptedAccessToken,
    filename: u.filename,
    wikitext: u.wikitext,
    copyright_override: u.copyright_override,
    labels: u.labels,
    result: null,
    error: null,
    success: null,
    celery_task_id: null,
    created_at: sql`CURRENT_TIMESTAMP`,
    updated_at: sql`CURRENT_TIMESTAMP`,
  }))
  await db.insert(uploadRequests).values(newUploads)
  const inserted = await db
    .select({ id: uploadRequests.id })
    .from(uploadRequests)
    .where(eq(uploadRequests.batchid, newBatchId))
    .orderBy(asc(uploadRequests.id))
  // TODO Phase 4: enqueue each inserted upload ID into BullMQ
  return { newUploadIds: inserted.map((r) => r.id), editGroupId, newBatchId }
}

export async function createUploadRequestsForBatch({
  userid,
  username: _username,
  batchid,
  items,
  handler,
  encryptedAccessToken,
}: {
  userid: string
  username: string
  batchid: number
  items: UploadItem[]
  handler: Handler
  encryptedAccessToken: string
}): Promise<{ id: number; key: string; status: UploadStatus }[]> {
  if (items.length === 0) return []
  const rows = items.map((it) => ({
    batchid,
    userid,
    status: 'queued' as const,
    key: it.id,
    handler,
    collection: it.input,
    access_token: encryptedAccessToken,
    filename: it.title,
    wikitext: it.wikitext,
    copyright_override: it.copyright_override ?? false,
    labels: it.labels ?? null,
    result: null,
    error: null,
    success: null,
    celery_task_id: null,
    created_at: sql`CURRENT_TIMESTAMP`,
    updated_at: sql`CURRENT_TIMESTAMP`,
  }))
  await db.insert(uploadRequests).values(rows)
  const keys = rows.map((r) => r.key)
  const inserted = await db
    .select({ id: uploadRequests.id, key: uploadRequests.key })
    .from(uploadRequests)
    .where(and(eq(uploadRequests.batchid, batchid), inArray(uploadRequests.key, keys)))
    .orderBy(asc(uploadRequests.id))
  return inserted.map((r) => ({ id: r.id, key: r.key, status: 'queued' as const }))
}

export async function markUploadsExpired(ids: number[]): Promise<void> {
  await db
    .update(uploadRequests)
    .set({
      status: 'failed',
      error: { type: 'error', message: 'Your session has expired. Please log in and retry.' },
    })
    .where(and(inArray(uploadRequests.id, ids), eq(uploadRequests.status, 'queued')))
}

export async function getQueuedUploadsForRecovery(): Promise<
  { id: number; userid: string; access_token: string | null; edit_group_id: string | null }[]
> {
  return db
    .select({
      id: uploadRequests.id,
      userid: uploadRequests.userid,
      access_token: uploadRequests.access_token,
      edit_group_id: batches.edit_group_id,
    })
    .from(uploadRequests)
    .innerJoin(batches, eq(uploadRequests.batchid, batches.id))
    .where(
      and(
        eq(uploadRequests.status, 'queued'),
        sql`${uploadRequests.access_token} IS NOT NULL`,
        sql`${batches.edit_group_id} IS NOT NULL`,
      ),
    )
}

const DUPLICATE_STATUSES = new Set([
  'duplicate',
  'duplicated_sdc_updated',
  'duplicated_sdc_not_updated',
])

function categorizeError(status: string, error: unknown): string {
  if (DUPLICATE_STATUSES.has(status)) return 'duplicate'
  const msg = JSON.stringify(error ?? '').toLowerCase()
  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests'))
    return 'rate_limit'
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('connection timeout'))
    return 'timeout'
  if (
    msg.includes('401') ||
    msg.includes('403') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden')
  )
    return 'auth'
  if (
    msg.includes('connection error') ||
    msg.includes('network unreachable') ||
    msg.includes('dns')
  )
    return 'network'
  return 'other'
}

export async function getFailedUploadsGrouped({
  offset = 0,
  limit = 50,
  sortBy = 'recent',
  errorType,
  handler,
  searchText,
}: {
  offset?: number
  limit?: number
  sortBy?: 'recent' | 'batchSize' | 'errorType' | 'user'
  errorType?: string
  handler?: string
  searchText?: string
} = {}): Promise<{
  items: {
    batch: {
      id: number
      createdAt: string
      editGroupId: string | null
      handler: string
      failedCount: number
      totalUploads: number
    }
    user: { username: string; userid: string }
    failedUploads: {
      id: number
      filename: string
      handler: string
      status: string
      error: unknown
      createdAt: string
      errorType: string
    }[]
  }[]
  total: number
}> {
  const orderCols = {
    recent: [desc(batches.created_at)],
    batchSize: [desc(count(uploadRequests.id))],
    errorType: [desc(batches.created_at)],
    user: [asc(users.username)],
  }[sortBy] ?? [desc(batches.created_at)]

  const whereParts: SQL[] = [eq(uploadRequests.status, 'failed') as SQL]
  if (handler) whereParts.push(eq(uploadRequests.handler, handler) as SQL)

  const groupRows = await db
    .select({
      batchid: uploadRequests.batchid,
      created_at: batches.created_at,
      edit_group_id: batches.edit_group_id,
      username: users.username,
      userid: users.userid,
      handler: sql<string>`MAX(${uploadRequests.handler})`,
      failedCount: count(uploadRequests.id),
    })
    .from(uploadRequests)
    .innerJoin(batches, eq(uploadRequests.batchid, batches.id))
    .innerJoin(users, eq(uploadRequests.userid, users.userid))
    .where(and(...whereParts))
    .groupBy(
      uploadRequests.batchid,
      batches.created_at,
      batches.edit_group_id,
      users.username,
      users.userid,
    )
    .orderBy(...orderCols)

  const filtered = searchText
    ? groupRows.filter((r) => {
        const q = searchText.toLowerCase()
        return (
          r.username.toLowerCase().includes(q) ||
          String(r.batchid).includes(q) ||
          r.handler.toLowerCase().includes(q)
        )
      })
    : groupRows

  if (filtered.length === 0) return { items: [], total: 0 }

  const allBatchIds = filtered.map((r) => r.batchid)
  const [detailRows, totalCounts] = await Promise.all([
    db
      .select()
      .from(uploadRequests)
      .where(and(eq(uploadRequests.status, 'failed'), inArray(uploadRequests.batchid, allBatchIds)))
      .orderBy(asc(uploadRequests.id)),
    db
      .select({ batchid: uploadRequests.batchid, n: count(uploadRequests.id) })
      .from(uploadRequests)
      .where(inArray(uploadRequests.batchid, allBatchIds))
      .groupBy(uploadRequests.batchid),
  ])

  const totalMap = new Map(totalCounts.map((r) => [r.batchid, r.n]))
  const detailMap = new Map<number, typeof detailRows>()
  for (const r of detailRows) {
    if (!detailMap.has(r.batchid)) detailMap.set(r.batchid, [])
    detailMap.get(r.batchid)!.push(r)
  }

  const allItems = filtered
    .map((r) => {
      const details = detailMap.get(r.batchid) ?? []
      const failedUploads = details.map((u) => ({
        id: u.id,
        filename: u.filename,
        handler: u.handler,
        status: u.status,
        error: u.error,
        createdAt: u.created_at?.toISOString() ?? '',
        errorType: categorizeError(u.status, u.error),
      }))
      if (errorType && !failedUploads.some((u) => u.errorType === errorType)) return null
      return {
        batch: {
          id: r.batchid,
          createdAt: r.created_at.toISOString(),
          editGroupId: r.edit_group_id,
          handler: r.handler,
          failedCount: r.failedCount,
          totalUploads: totalMap.get(r.batchid) ?? 0,
        },
        user: { username: r.username, userid: r.userid },
        failedUploads,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  const total = allItems.length
  const items = allItems.slice(offset, offset + limit)

  return { items, total }
}
