import * as Sentry from '@sentry/nuxt'
import {
    commitHash,
} from './utils/constants'

Sentry.init({
    enabled: (process.env.SENTRY_ENABLED ?? 'true') == 'true',
    autoSessionTracking: import.meta.client,
    debug: process.env.NODE_ENV !== 'production',
    dsn: process.env.SENTRY_DSN,
    release: commitHash,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
})
Sentry.setUser({
    id: 'server',
})
