import { config } from '@backend/config'
import { encryptAccessToken } from '@backend/core/crypto'
import type { SessionUser } from '@backend/core/session'
import type { BatchItem as DalBatchItem } from '@backend/db/dal/batches'
import {
  countBatches,
  countUploadsInBatch,
  createBatch,
  getBatch,
  getBatchIdsWithRecentChanges,
  getBatches,
  getBatchesMinimal,
  getLatestUpdateTime,
} from '@backend/db/dal/batches'
import {
  createPreset,
  deletePreset as deletePresetDal,
  getPresetsForHandler,
  updatePreset,
} from '@backend/db/dal/presets'
import type { BatchUploadItem as DalBatchUploadItem } from '@backend/db/dal/uploads'
import {
  cancelBatch as cancelBatchDal,
  createUploadRequestsForBatch,
  getUploadsByBatch,
  retrySelectedUploadsToNewBatch,
} from '@backend/db/dal/uploads'
import { ensureUser } from '@backend/db/dal/users'
import { MapillaryHandler } from '@backend/handlers/mapillary'
import { MediaWikiClient } from '@backend/mediawiki/client'
import { WikidataClient } from '@backend/mediawiki/wikidata'
import type {
  BatchItem,
  BatchUploadItem,
  PresetItem,
  ServerMessage,
  UploadItem,
  UploadUpdateItem,
} from '@backend/types/ws'

const UPLOAD_DONE_STATUSES = new Set([
  'completed',
  'failed',
  'duplicate',
  'duplicated_sdc_updated',
  'duplicated_sdc_not_updated',
])

const STREAM_INTERVAL_MS = 2000
const BATCH_RETRIEVAL_CHUNK_SIZE = 100

export interface WsSender {
  send(msg: ServerMessage): void
}

type SessionUserWithAuth = SessionUser & {
  access_token: [string, string]
}

function nonce(): string {
  return new Date().toISOString()
}

function presetRowToItem(p: {
  id: number
  title: string
  title_template: string
  labels: unknown
  categories: string | null
  exclude_from_date_category: boolean
  handler: string
  is_default: boolean
  created_at: Date
  updated_at: Date
}): PresetItem {
  return {
    id: p.id,
    title: p.title,
    title_template: p.title_template,
    labels: p.labels as PresetItem['labels'],
    categories: p.categories ?? '',
    exclude_from_date_category: p.exclude_from_date_category,
    handler: p.handler,
    is_default: p.is_default,
    created_at: p.created_at.toISOString(),
    updated_at: p.updated_at.toISOString(),
  }
}

function toUploadUpdateItem(u: DalBatchUploadItem): UploadUpdateItem {
  return {
    id: u.id,
    batchid: u.batchid,
    status: u.status,
    key: u.key || 'unknown',
    handler: u.handler || 'unknown',
    error: u.error as UploadUpdateItem['error'],
    success: u.success ?? null,
  }
}

function toWsBatchItem(b: DalBatchItem): BatchItem {
  return { ...b, username: b.username ?? '' }
}

class OptimizedBatchStreamer {
  private sender: WsSender
  private username: string
  private lastUpdateTime: Date | null = null
  private interval: ReturnType<typeof setTimeout> | null = null

  constructor(sender: WsSender, username: string) {
    this.sender = sender
    this.username = username
  }

  async startStreaming(
    userid: string | undefined,
    filterText: string | undefined,
    page: number,
    limit: number,
  ): Promise<void> {
    const offset = (page - 1) * limit
    const [items, total] = await Promise.all([
      getBatches({ offset, limit, filterText, userid }),
      countBatches({ filterText, userid }),
    ])
    this.sender.send({
      type: 'BATCHES_LIST',
      data: { items: items.map(toWsBatchItem), total },
      partial: false,
      nonce: nonce(),
    })
    this.lastUpdateTime = await getLatestUpdateTime({ userid, filterText })

    if (page > 1) return

    const poll = async () => {
      try {
        const current = await getLatestUpdateTime({ userid, filterText })
        if (current && (!this.lastUpdateTime || current > this.lastUpdateTime)) {
          const checkTime = this.lastUpdateTime ?? new Date(0)
          const changedIds = await getBatchIdsWithRecentChanges(checkTime, {
            userid,
            filterText,
          })
          if (changedIds.length > 0) {
            const changed = await getBatchesMinimal(changedIds)
            if (changed.length > 0) {
              const newTotal = await countBatches({ filterText, userid })
              this.sender.send({
                type: 'BATCHES_LIST',
                data: { items: changed.map(toWsBatchItem), total: newTotal },
                partial: true,
                nonce: nonce(),
              })
            }
          }
          this.lastUpdateTime = current
        }
      } catch (e) {
        console.error(`[ws] streaming error for ${this.username}:`, e)
      }
      this.interval = setTimeout(poll, STREAM_INTERVAL_MS)
    }
    this.interval = setTimeout(poll, 0)
  }

  stopStreaming(): void {
    if (this.interval) {
      clearTimeout(this.interval)
      this.interval = null
    }
  }
}

export class Handler {
  private user: SessionUserWithAuth
  private username: string
  private userid: string
  private sender: WsSender
  private uploadsInterval: ReturnType<typeof setTimeout> | null = null
  private batchesListInterval: ReturnType<typeof setInterval> | null = null
  private batchStreamer: OptimizedBatchStreamer

  constructor(user: SessionUserWithAuth, sender: WsSender) {
    this.user = user
    this.username = user.username
    this.userid = user.sub
    this.sender = sender
    this.batchStreamer = new OptimizedBatchStreamer(sender, this.username)
  }

  cancelTasks(): void {
    if (this.uploadsInterval) {
      clearTimeout(this.uploadsInterval)
      this.uploadsInterval = null
    }
    if (this.batchesListInterval) {
      clearInterval(this.batchesListInterval)
      this.batchesListInterval = null
    }
    this.batchStreamer.stopStreaming()
  }

  private sendError(message: string): void {
    this.sender.send({ type: 'ERROR', data: message, nonce: nonce() })
  }

  private async safe(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn()
    } catch (e) {
      console.error(`[ws] error in ${name} for ${this.username}:`, e)
      this.sendError('Internal server error — please notify the administrator')
    }
  }

  async fetchBatches(data: {
    page: number
    limit: number
    userid?: string
    filter?: string
  }): Promise<void> {
    await this.safe('fetchBatches', async () => {
      this.batchStreamer.stopStreaming()
      this.batchStreamer = new OptimizedBatchStreamer(this.sender, this.username)
      await this.batchStreamer.startStreaming(data.userid, data.filter, data.page, data.limit)
    })
  }

  async fetchBatchUploads(batchid: number): Promise<void> {
    await this.safe('fetchBatchUploads', async () => {
      const batch = await getBatch(batchid)
      if (!batch) {
        this.sendError(`Batch ${batchid} not found`)
        return
      }
      const uploads = await getUploadsByBatch(batchid)
      this.sender.send({
        type: 'BATCH_UPLOADS_LIST',
        data: {
          batch: { ...batch, username: batch.username ?? '' },
          uploads: uploads.map((u) => ({
            id: u.id,
            status: u.status,
            filename: u.filename,
            wikitext: u.wikitext,
            batchid: u.batchid,
            userid: u.userid,
            key: u.key,
            handler: u.handler,
            labels: u.labels as BatchUploadItem['labels'],
            result: u.result,
            error: u.error as BatchUploadItem['error'],
            success: u.success,
            created_at: u.created_at ?? '',
            updated_at: u.updated_at ?? '',
            image_id: u.image_id,
          })),
        },
        nonce: nonce(),
      })
    })
  }

  async retryUploads(batchid: number): Promise<void> {
    await this.safe('retryUploads', async () => {
      const encryptedAccessToken = encryptAccessToken(this.user.access_token)
      // retrySelectedUploadsToNewBatch in TS DAL expects upload ids list; port from
      // python reset_failed_uploads_to_new_batch — look up failed uploads first.
      const all = await getUploadsByBatch(batchid)
      const failedIds = all.filter((u) => u.status === 'failed').map((u) => u.id)
      if (failedIds.length === 0) {
        this.sendError('No failed uploads to retry')
        return
      }
      const { newUploadIds, editGroupId, newBatchId } = await retrySelectedUploadsToNewBatch(
        failedIds,
        encryptedAccessToken,
        this.userid,
        this.username,
      )
      if (newUploadIds.length === 0 || !editGroupId) {
        this.sendError('No failed uploads to retry')
        return
      }
      // TODO Phase-4: enqueue retried upload IDs into BullMQ with editGroupId
      this.sender.send({
        type: 'RETRY_UPLOADS_RESPONSE',
        data: newBatchId,
        nonce: nonce(),
      })
    })
  }

  async cancelBatch(batchid: number): Promise<void> {
    await this.safe('cancelBatch', async () => {
      const isAdmin = this.username === config.xUsername
      const userid = isAdmin ? undefined : this.userid
      let cancelled: Map<number, string | null>
      try {
        cancelled = await cancelBatchDal(batchid, userid)
      } catch (e) {
        const msg = (e as Error).message
        if (msg.includes('not found')) {
          this.sendError(`Batch ${batchid} not found`)
          return
        }
        if (msg.includes('Permission')) {
          this.sendError('Permission denied')
          return
        }
        throw e
      }
      if (cancelled.size === 0) {
        this.sendError('No queued items to cancel')
        return
      }
      // TODO Phase-4: revoke BullMQ jobs by their stored task ids
    })
  }

  async subscribeBatch(batchid: number): Promise<void> {
    await this.safe('subscribeBatch', async () => {
      if (this.uploadsInterval) clearTimeout(this.uploadsInterval)
      this.uploadsInterval = this.startUploadStream(batchid)
      this.sender.send({ type: 'SUBSCRIBED', data: batchid, nonce: nonce() })
    })
  }

  async unsubscribeBatch(): Promise<void> {
    if (this.uploadsInterval) {
      clearTimeout(this.uploadsInterval)
      this.uploadsInterval = null
    }
  }

  async subscribeBatchesList(data: { userid?: string; filter?: string }): Promise<void> {
    await this.safe('subscribeBatchesList', async () => {
      this.batchStreamer.stopStreaming()
      this.batchStreamer = new OptimizedBatchStreamer(this.sender, this.username)
      await this.batchStreamer.startStreaming(data.userid, data.filter, 1, 100)
    })
  }

  async unsubscribeBatchesList(): Promise<void> {
    this.batchStreamer.stopStreaming()
  }

  async createBatch(): Promise<void> {
    await this.safe('createBatch', async () => {
      await ensureUser(this.userid, this.username)
      const batch = await createBatch(this.userid, this.username)
      this.sender.send({ type: 'BATCH_CREATED', data: batch.id, nonce: nonce() })
    })
  }

  async deletePreset(presetId: number): Promise<void> {
    await this.safe('deletePreset', async () => {
      // Find handler for the preset by looking up presets across both handlers
      const ok = await deletePresetDal(presetId, this.userid)
      if (!ok) {
        this.sendError('Preset not found or permission denied')
        return
      }
      // Return refreshed list (mapillary is the only handler)
      await this.fetchPresets('mapillary')
    })
  }

  async fetchImages(collection: string, _handlerType: 'mapillary'): Promise<void> {
    await this.safe('fetchImages', async () => {
      const handler = new MapillaryHandler()
      try {
        const { images, sequenceId } = await handler.fetchCollection(collection)
        if (Object.keys(images).length === 0) {
          this.sendError('Collection not found')
          return
        }
        const first = Object.values(images)[0]!
        this.sender.send({
          type: 'COLLECTION_IMAGES',
          data: { images, creator: first.creator, sequence_id: sequenceId },
          nonce: nonce(),
        })
      } catch (e) {
        const msg = (e as Error).message
        // Switch to batch retrieval on timeout / 500
        if (msg.includes('timeout') || msg.includes('500') || msg.includes('aborted')) {
          await this.fetchImagesInBatches(collection, handler)
          return
        }
        console.error(`[mapillary] API error for ${collection}:`, e)
        this.sendError(`Mapillary API Error: ${msg}`)
      }
    })
  }

  private async fetchImagesInBatches(collection: string, handler: MapillaryHandler): Promise<void> {
    this.sender.send({
      type: 'TRY_BATCH_RETRIEVAL',
      data: 'Large collection detected. Loading in batches...',
      nonce: nonce(),
    })
    try {
      const ids = await handler.fetchCollectionIds(collection)
      if (ids.length === 0) {
        this.sendError('Collection has no images')
        return
      }
      this.sender.send({ type: 'COLLECTION_IMAGE_IDS', data: ids, nonce: nonce() })
      for (let i = 0; i < ids.length; i += BATCH_RETRIEVAL_CHUNK_SIZE) {
        const chunk = ids.slice(i, i + BATCH_RETRIEVAL_CHUNK_SIZE)
        const batchImages = await handler.fetchImagesBatch(chunk, collection)
        this.sender.send({
          type: 'PARTIAL_COLLECTION_IMAGES',
          data: { images: Object.values(batchImages), collection },
          nonce: nonce(),
        })
      }
    } catch (e) {
      console.error(`[mapillary] Batch retrieval failed for ${collection}:`, e)
      this.sendError(`Batch retrieval failed: ${(e as Error).message}`)
    }
  }

  async fetchPresets(handlerType: 'mapillary'): Promise<void> {
    await this.safe('fetchPresets', async () => {
      const rows = await getPresetsForHandler(this.userid, handlerType)
      this.sender.send({
        type: 'PRESETS_LIST',
        data: {
          handler: handlerType,
          presets: rows.map(presetRowToItem),
        },
        nonce: nonce(),
      })
    })
  }

  async savePreset(data: {
    preset_id?: number
    title: string
    title_template: string
    labels?: PresetItem['labels'] | null
    categories: string
    exclude_from_date_category?: boolean
    is_default?: boolean
    handler: string
  }): Promise<void> {
    await this.safe('savePreset', async () => {
      if (data.preset_id) {
        const updated = await updatePreset(data.preset_id, this.userid, {
          title: data.title,
          title_template: data.title_template,
          labels: data.labels,
          categories: data.categories,
          exclude_from_date_category: data.exclude_from_date_category,
          is_default: data.is_default,
        })
        if (!updated) {
          this.sendError('Preset not found or permission denied')
          return
        }
      } else {
        await createPreset({
          userid: this.userid,
          handler: data.handler,
          title: data.title,
          title_template: data.title_template,
          labels: data.labels,
          categories: data.categories,
          exclude_from_date_category: data.exclude_from_date_category,
          is_default: data.is_default,
        })
      }
      await this.fetchPresets(data.handler as 'mapillary')
    })
  }

  async uploadSlice(data: {
    batchid: number
    sliceid: number
    items: UploadItem[]
    handler?: string
  }): Promise<void> {
    await this.safe('uploadSlice', async () => {
      const batch = await getBatch(data.batchid)
      if (!batch) {
        this.sendError(`Batch ${data.batchid} not found`)
        return
      }
      if (!batch.edit_group_id) {
        this.sendError(`Batch ${data.batchid} has no edit_group_id`)
        return
      }
      const encryptedAccessToken = encryptAccessToken(this.user.access_token)
      const handlerName = data.handler ?? 'mapillary'
      const created = await createUploadRequestsForBatch({
        userid: this.userid,
        username: this.username,
        batchid: data.batchid,
        items: data.items,
        handler: handlerName,
        encryptedAccessToken,
      })
      // TODO Phase-4: enqueue created upload IDs into BullMQ with edit_group_id
      this.sender.send({
        type: 'UPLOAD_SLICE_ACK',
        data: created.map((c) => ({ id: c.key, status: c.status })),
        sliceid: data.sliceid,
        nonce: nonce(),
      })
    })
  }

  async checkCategoriesDeleted(titles: string[]): Promise<void> {
    await this.safe('checkCategoriesDeleted', async () => {
      const mw = new MediaWikiClient(this.user.access_token)
      const results = await Promise.all(titles.map((t) => mw.isCategoryDeleted(t)))
      const deleted = titles.filter((_, i) => results[i])
      if (deleted.length > 0) {
        this.sender.send({
          type: 'CATEGORIES_DELETED_RESPONSE',
          data: { deleted },
          nonce: nonce(),
        })
      }
    })
  }

  async createCategory(title: string, text: string, wikidataQid?: string): Promise<void> {
    await this.safe('createCategory', async () => {
      const mw = new MediaWikiClient(this.user.access_token)
      let createdTitle: string
      try {
        createdTitle = await mw.createPage(`Category:${title}`, text)
      } catch (e) {
        this.sendError((e as Error).message)
        return
      }
      const normalized = createdTitle.replace(/ /g, '_')
      this.sender.send({
        type: 'CATEGORY_CREATED_RESPONSE',
        data: { title: normalized },
        nonce: nonce(),
      })
      if (wikidataQid) {
        try {
          const wd = new WikidataClient(this.user.access_token)
          const entity = await wd.fetchItem(wikidataQid)
          const existingClaims = (entity.claims as Record<string, unknown[]>)?.P373 ?? []
          const categoryName = title.replace(/_/g, ' ')
          const newClaim = {
            mainsnak: {
              snaktype: 'value',
              property: 'P373',
              datavalue: { type: 'string', value: categoryName },
            },
            type: 'statement',
            rank: 'normal',
          }
          const alreadyExists = existingClaims.some(
            (c) =>
              (c as { mainsnak?: { datavalue?: { value?: unknown } } }).mainsnak?.datavalue
                ?.value === categoryName,
          )
          const claims = alreadyExists ? existingClaims : [...existingClaims, newClaim]
          const sitelinks = {
            commonswiki: { site: 'commonswiki', title: `Category:${title}` },
          }
          await wd.editItem(wikidataQid, claims, sitelinks)
        } catch (e) {
          console.error(`[ws] Wikidata edit failed for ${wikidataQid}:`, e)
        }
      }
    })
  }

  async recategorizeFiles(source: string, target: string): Promise<void> {
    await this.safe('recategorizeFiles', async () => {
      const mw = new MediaWikiClient(this.user.access_token)
      const titles = await mw.getCategoryMembers(source)
      let count = 0
      for (const t of titles) {
        const replaced = await mw.replaceCategoryInPage(t, source, target)
        if (replaced) count++
      }
      this.sender.send({
        type: 'RECATEGORIZE_FILES_RESPONSE',
        data: { source, count },
        nonce: nonce(),
      })
    })
  }

  private startUploadStream(batchid: number): ReturnType<typeof setTimeout> {
    let lastSerialized: string | null = null
    const poll = async () => {
      try {
        const items = await getUploadsByBatch(batchid)
        const updateItems = items.map(toUploadUpdateItem)
        const serialized = JSON.stringify(updateItems)
        if (serialized !== lastSerialized) {
          this.sender.send({
            type: 'UPLOADS_UPDATE',
            data: updateItems,
            nonce: nonce(),
          })
          lastSerialized = serialized
        }
        const total = await countUploadsInBatch(batchid)
        const completed = items.filter((i) => UPLOAD_DONE_STATUSES.has(i.status)).length
        if (total > 0 && completed >= total) {
          this.sender.send({
            type: 'UPLOADS_COMPLETE',
            data: batchid,
            nonce: nonce(),
          })
          if (this.uploadsInterval) {
            clearTimeout(this.uploadsInterval)
            this.uploadsInterval = null
          }
          return
        }
      } catch (e) {
        console.error(`[ws] stream_uploads error for batch ${batchid}:`, e)
      }
      this.uploadsInterval = setTimeout(poll, STREAM_INTERVAL_MS)
    }
    return setTimeout(poll, 0)
  }
}
