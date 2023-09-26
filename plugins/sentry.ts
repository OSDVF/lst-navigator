import * as Sentry from '@sentry/vue'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin({
    parallel: true,
    setup(nuxtApp) {
        const config = useRuntimeConfig()
        const sentryConfig = {
            enabled: config.public.SENTRY_ENABLED,
            autoSessionTracking: process.client,
            debug: config.public.ENV !== 'production',
            dsn: config.public.SENTRY_DSN,
            release: config.public.commitHash,
            environment: config.public.ENV
        }

        Sentry.init({
            ...sentryConfig,
            app: nuxtApp.vueApp,
            integrations: [
                ...(process.client
                    ? [new Sentry.Replay()]
                    : [])
            ],
            trackComponents: process.client,
            hooks: ['activate', 'create', 'destroy', 'mount', 'update'],
            // Capture Replay for 10% of all sessions,
            // plus for 100% of sessions with an error
            replaysSessionSampleRate: process.client ? 0.1 : undefined,
            replaysOnErrorSampleRate: process.client ? 1 : undefined
        })
        if (process.client) {
            navigator.serviceWorker?.controller?.postMessage({
                type: 'INITIALIZE_SENTRY',
                config: sentryConfig
            })
        } else {
            Sentry.setUser({
                id: 'server'
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
