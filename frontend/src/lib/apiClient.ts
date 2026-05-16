import type { App } from '@backend/app'
import { treaty } from '@elysiajs/eden'

export const api = treaty<App>(typeof window !== 'undefined' ? window.location.origin : '')
