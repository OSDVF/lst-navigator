import * as Sentry from '@sentry/vue'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin({
    parallel: true,
    setup(nuxtApp) {
        const config = useRuntimeConfig()
        const sentryConfig : Partial<Sentry.BrowserOptions> = {
            enabled: config.public.SENTRY_ENABLED,
            autoSessionTracking: true,
            debug: config.public.ENV !== 'production',
            dsn: config.public.SENTRY_DSN,
            release: config.public.commitHash,
            environment: config.public.ENV
        }

        Sentry.init({
            ...sentryConfig,
            app: nuxtApp.vueApp,
            integrations: [new Sentry.Replay()],
            trackComponents: true,
            hooks: ['activate', 'create', 'destroy', 'mount', 'update'],
            // Capture Replay for 10% of all sessions,
            // plus for 100% of sessions with an error
            replaysSessionSampleRate: 0.1,
            replaysOnErrorSampleRate: 1
        })
        if (process.client) {
            navigator.serviceWorker?.controller?.postMessage({
                type: 'INITIALIZE_SENTRY',
                config: sentryConfig
            })
        }
        nuxtApp.hook('vue:error', (err) => {
            Sentry.captureException(err)
            console.error('vue:error', err)
        })
        nuxtApp.vueApp.config.errorHandler = (error, context) => {
            Sentry.captureException(error)
            console.error('errorHandler', error, context)
        }

        nuxtApp.provide('Sentry', Sentry)
    }
})
