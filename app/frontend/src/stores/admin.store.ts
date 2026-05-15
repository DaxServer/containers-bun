import type { AdminBatch, AdminPreset, AdminUploadRequest, AdminUser } from '@/types/admin'
import { UPLOAD_STATUS } from '@/types/image'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'

export const useAdminStore = defineStore('admin', () => {
  const adminTable = ref<'batches' | 'users' | 'upload_requests' | 'presets'>('batches')
  const adminBatches = shallowRef<AdminBatch[]>([])
  const adminUsers = shallowRef<AdminUser[]>([])
  const adminUploadRequests = shallowRef<AdminUploadRequest[]>([])
  const adminPresets = shallowRef<AdminPreset[]>([])
  const adminTotal = ref(0)
  const adminLoading = ref(false)
  const adminParams = ref({
    first: 0,
    rows: 100,
    page: 1,
  })
  const adminFilterText = ref('')
  const adminStatusFilter = ref<string[]>([])
  const adminDateRange = ref<[Date, Date | null] | null>(null)
  const selectedUploadRequests = ref<AdminUploadRequest[]>([])

  const cancellableCount = computed(
    () =>
      selectedUploadRequests.value.filter(
        (r) => r.status === UPLOAD_STATUS.Queued || r.status === UPLOAD_STATUS.InProgress,
      ).length,
  )

  const failableCount = computed(
    () => selectedUploadRequests.value.filter((r) => r.status !== UPLOAD_STATUS.Failed).length,
  )

  const data = computed(() => {
    switch (adminTable.value) {
      case 'batches':
        return {
          table: adminTable.value,
          columns: [
            { field: 'id', header: 'ID' },
            { field: 'userid', header: 'User ID' },
            { field: 'edit_group_id', header: 'Edit Group ID' },
            { field: 'created_at', header: 'Created At' },
            { field: 'updated_at', header: 'Updated At' },
          ],
          data: adminBatches.value,
        }
      case 'users':
        return {
          table: adminTable.value,
          columns: [
            { field: 'userid', header: 'User ID' },
            { field: 'username', header: 'Username' },
            { field: 'created_at', header: 'Created At' },
            { field: 'updated_at', header: 'Updated At' },
          ],
          data: adminUsers.value,
        }
      case 'upload_requests':
        return {
          table: adminTable.value,
          columns: [
            { field: 'id', header: 'ID' },
            { field: 'batchid', header: 'Batch ID' },
            { field: 'userid', header: 'User ID' },
            { field: 'status', header: 'Status' },
            { field: 'filename', header: 'Filename' },
            { field: 'wikitext', header: 'Wikitext' },
            { field: 'created_at', header: 'Created At' },
            { field: 'updated_at', header: 'Updated At' },
          ],
          data: adminUploadRequests.value,
        }
      case 'presets':
        return {
          table: adminTable.value,
          columns: [
            { field: 'id', header: 'ID' },
            { field: 'userid', header: 'User ID' },
            { field: 'handler', header: 'Handler' },
            { field: 'title', header: 'Title' },
            { field: 'title_template', header: 'Title Template' },
            { field: 'categories', header: 'Categories' },
            { field: 'is_default', header: 'Is Default' },
            { field: 'labels', header: 'Labels' },
            { field: 'exclude_from_date_category', header: 'Exclude from Date Category' },
            { field: 'created_at', header: 'Created At' },
            { field: 'updated_at', header: 'Updated At' },
          ],
          data: adminPresets.value,
        }
    }
  })

  return {
    adminTable,
    adminBatches,
    adminUsers,
    adminUploadRequests,
    adminPresets,
    adminTotal,
    adminLoading,
    adminParams,
    adminFilterText,
    adminStatusFilter,
    adminDateRange,
    selectedUploadRequests,
    cancellableCount,
    failableCount,
    data,
  }
})
