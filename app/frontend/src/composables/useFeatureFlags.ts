import { useAuthStore } from '@/stores/auth.store'
import { computed } from 'vue'

export const useFeatureFlags = () => {
  const auth = useAuthStore()
  const adminEnabled = computed(() => auth.isAdmin)

  return {
    adminEnabled,
  }
}
