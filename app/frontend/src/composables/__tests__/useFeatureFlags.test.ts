import { useFeatureFlags } from '@/composables/useFeatureFlags'
import { useAuthStore } from '@/stores/auth.store'
import { beforeEach, describe, expect, it } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'

describe('useFeatureFlags', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('adminEnabled', () => {
    it('returns false when no user is authenticated', () => {
      const { adminEnabled } = useFeatureFlags()

      expect(adminEnabled.value).toBe(false)
    })

    it('returns false for non-admin users', () => {
      const auth = useAuthStore()
      auth.user = 'testuser'
      const { adminEnabled } = useFeatureFlags()

      expect(adminEnabled.value).toBe(false)
    })

    it('updates reactively when user changes', () => {
      const auth = useAuthStore()
      const { adminEnabled } = useFeatureFlags()

      expect(adminEnabled.value).toBe(false)

      auth.user = 'DaxServer'
      expect(adminEnabled.value).toBe(true)

      auth.user = 'someoneelse'
      expect(adminEnabled.value).toBe(false)
    })
  })
})
