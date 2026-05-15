import { api } from '@frontend/lib/apiClient'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<string>('')
  const userid = ref<string>('')
  const isAuthenticated = computed(() => !!user.value)
  const isAuthorized = ref(false)
  const isLoading = ref(false)
  const isAdmin = computed(() => user.value === 'DaxServer')

  const reset = () => {
    user.value = ''
    userid.value = ''
    isAuthorized.value = false
  }

  const login = () => {
    isLoading.value = true
    window.location.href = '/auth/login'
  }

  const logout = async () => {
    try {
      await api.auth.logout.get()
      reset()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      isLoading.value = false
    }
  }

  const checkAuth = async () => {
    isLoading.value = true
    try {
      const { data, status } = await api.auth.whoami.get()
      if (status === 200 && data) {
        const userData = data as { username: string; userid: string; authorized: boolean }
        user.value = userData.username
        userid.value = userData.userid
        isAuthorized.value = userData.authorized
      } else {
        reset()
      }
    } catch (error) {
      console.error('Authentication check failed:', error)
      reset()
    } finally {
      isLoading.value = false
    }
  }

  return {
    isAuthenticated,
    isAuthorized,
    isLoading,
    user,
    userid,
    isAdmin,
    login,
    logout,
    checkAuth,
  }
})
