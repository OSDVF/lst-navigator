import * as Sentry from '@sentry/vue'
import type { Router } from 'vue-router'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin({
    parallel: true,
    setup() {
        const config = useRuntimeConfig()
        const nuxtApp = useNuxtApp()
        const sentryConfig = {
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
            integrations: [
                ...(process.client
                    ? [new Sentry.BrowserTracing({
                        routingInstrumentation: Sentry.vueRouterInstrumentation(nuxtApp.$router as Router),
                        tracePropagationTargets: config.public.SENTRY_TRACE_PROPAGATION_TARGET ? [config.public.SENTRY_TRACE_PROPAGATION_TARGET] : undefined
                    }),
                    new Sentry.Replay()]
                    : [])
            ],
            trackComponents: process.client,
            hooks: ['activate', 'create', 'destroy', 'mount', 'update'],
            // Set tracesSampleRate to 1.0 to capture 100%
            // of transactions for performance monitoring.
            // We recommend adjusting this value in production
            tracesSampleRate: 0.2,

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

        nuxtApp.vueApp.config.errorHandler = (error, context) => {
            Sentry.captureException(error)
            console.error('errorHandler', error, context)
        }
        nuxtApp.hook('vue:error', (err) => {
            Sentry.captureException(err)
            console.error('vue:error', err)
        })

        return {
            provide: {
                Sentry
            }
        }
    }
})
