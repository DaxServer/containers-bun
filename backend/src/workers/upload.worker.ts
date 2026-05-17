import { config } from '@backend/config'
import { decryptAccessToken } from '@backend/core/crypto'
import {
  DuplicateUploadError,
  HashLockError,
  SourceCdnError,
  StorageError,
} from '@backend/core/errors'
import { clearUploadAccessToken, getUploadById, updateUploadStatus } from '@backend/db/dal/uploads'
import { MapillaryHandler } from '@backend/handlers/mapillary'
import { workerLogger } from '@backend/logger'
import { MediaWikiClient } from '@backend/mediawiki/client'
import { buildStatementsFromMapillaryImage } from '@backend/mediawiki/sdc'
import type { UploadJobData } from '@backend/workers/queue'
import { Worker } from 'bullmq'
import type { Redis } from 'ioredis'

const EDIT_SUMMARY = (editGroupId: string) =>
  `Uploaded via Curator | https://editgroups.io/b/OR/${editGroupId}/`

export function createUploadWorker(redis: Redis): Worker<UploadJobData> {
  const worker = new Worker<UploadJobData>(
    'uploads',
    async (job) => {
      const { uploadId, batchId, editGroupId } = job.data

      const upload = await getUploadById(uploadId)
      if (!upload) {
        workerLogger.error({ uploadId }, 'Upload not found, skipping')
        return
      }

      if (upload.status === 'cancelled') return

      if (!upload.access_token) {
        await updateUploadStatus(uploadId, 'failed', {
          type: 'error',
          message: 'Your session has expired. Please log in and retry.',
        })
        return
      }

      let accessToken: [string, string]
      try {
        accessToken = decryptAccessToken(upload.access_token)
      } catch {
        await updateUploadStatus(uploadId, 'failed', {
          type: 'error',
          message: 'Your session has expired. Please log in and retry.',
        })
        return
      }

      const mw = new MediaWikiClient(accessToken)

      const { blacklisted, reason } = await mw.checkTitleBlacklisted(upload.filename)
      if (blacklisted) {
        await updateUploadStatus(uploadId, 'failed', {
          type: 'title_blacklisted',
          message: reason,
        })
        await clearUploadAccessToken(uploadId)
        return
      }

      const handler = new MapillaryHandler()
      const images = await handler.fetchImagesBatch([upload.key], upload.collection ?? upload.key)
      const image = images.find((i) => i.id === upload.key)

      if (!image) {
        throw new Error(`Image ${upload.key} not found in Mapillary — will retry`)
      }

      await updateUploadStatus(uploadId, 'in_progress')

      const editSummary = EDIT_SUMMARY(editGroupId)

      try {
        const fileUrl = await mw.uploadFile(
          upload.filename,
          image.urls.original,
          upload.wikitext,
          editSummary,
          redis,
          uploadId,
          batchId,
        )

        const claims = buildStatementsFromMapillaryImage(image, !upload.copyright_override)
        const labels = upload.labels as { language: string; value: string } | null
        const labelsPayload = labels
          ? { [labels.language]: { language: labels.language, value: labels.value } }
          : null
        await mw.applySdc(upload.filename, claims, labelsPayload, editSummary)
        await mw.nullEdit(upload.filename)

        await updateUploadStatus(uploadId, 'completed', null, fileUrl)
        await clearUploadAccessToken(uploadId)
      } catch (err) {
        if (err instanceof DuplicateUploadError) {
          const links = err.duplicates

          if (links.length > 0) {
            const dupeFilename = links[0]!.title.replace(/^File:/, '')
            const claims = buildStatementsFromMapillaryImage(image, !upload.copyright_override)
            const labels = upload.labels as { language: string; value: string } | null
            const labelsPayload = labels
              ? { [labels.language]: { language: labels.language, value: labels.value } }
              : null

            try {
              await mw.applySdc(dupeFilename, claims, labelsPayload, editSummary)
              await updateUploadStatus(uploadId, 'duplicated_sdc_updated', {
                type: 'duplicated_sdc_updated',
                links,
                message: 'File already exists on Commons. SDC updated.',
              })
            } catch {
              await updateUploadStatus(uploadId, 'duplicated_sdc_not_updated', {
                type: 'duplicated_sdc_not_updated',
                links,
                message: 'File already exists on Commons. SDC could not be updated.',
              })
            }
          } else {
            await updateUploadStatus(uploadId, 'duplicate', {
              type: 'duplicate',
              links: [],
              message: 'File already exists on Commons.',
            })
          }

          await clearUploadAccessToken(uploadId)
          return
        }

        if (
          err instanceof HashLockError ||
          err instanceof StorageError ||
          err instanceof SourceCdnError
        ) {
          throw err
        }

        const message = err instanceof Error ? err.message : 'Unknown error'
        await updateUploadStatus(uploadId, 'failed', { type: 'error', message })
        await clearUploadAccessToken(uploadId)
      }
    },
    {
      connection: { url: config.redisUrl },
      concurrency: Number(config.workerConcurrency),
    },
  )

  worker.on('failed', (job, err) => {
    workerLogger.error({ jobId: job?.id, err }, 'Job permanently failed')
  })

  return worker
}
