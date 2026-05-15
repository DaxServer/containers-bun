<script setup lang="ts">
const store = useCollectionsStore()
const auth = useAuthStore()
const { open } = useSocket

initCollectionsListeners()

onMounted(() => {
  open()
})
</script>

<template>
  <main>
    <ConfirmDialog />
    <Toast />
    <Header />

    <template v-if="auth.isAuthenticated">
      <div
        v-if="store.error"
        class="max-w-7xl mx-auto mb-4"
      >
        <Message
          severity="error"
          icon="pi pi-exclamation-triangle"
          :closable="true"
          @close="store.clearError"
        >
          {{ store.error }}
        </Message>
      </div>
      <router-view v-slot="{ Component }">
        <KeepAlive :include="['BatchesView']">
          <component :is="Component" />
        </KeepAlive>
      </router-view>
    </template>

    <div
      v-else
      class="py-48 flex justify-center items-center"
    >
      <Button
        color="primary"
        :loading="auth.isLoading"
        :disabled="auth.isLoading"
        label="Login with Wikimedia Commons"
        @click="auth.login"
      />
    </div>

    <Footer />
  </main>
</template>
