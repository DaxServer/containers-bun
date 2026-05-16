import '@frontend/assets/tailwind.css'

// PrimeVue
import 'primeicons/primeicons.css'
import { FocusTrap, Tooltip } from 'primevue'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'

import Noir from '@frontend/assets/Noir'
import App from '@frontend/App.vue'
import router from '@frontend/router'

// Create app
const app = createApp(App)

// Create Pinia
const pinia = createPinia()

// Register plugins
app.use(pinia)
app.use(router)
app.use(ConfirmationService)
app.use(ToastService)

// Register PrimeVue
app.use(PrimeVue, {
  theme: {
    preset: Noir,
    options: {
      darkModeSelector: false,
    },
  },
})

app.directive('focustrap', FocusTrap)
app.directive('tooltip', Tooltip)

// Mount the app
app.mount('#app')
