import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import * as Sentry from '@sentry/vue'
import type { Router } from 'vue-router'

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
                new Sentry.BrowserTracing({
                    routingInstrumentation: Sentry.vueRouterInstrumentation(nuxtApp.$router as Router),
                    tracePropagationTargets: [config.public.SENTRY_TRACE_PROPAGATION_TARGET]
                }),
                new Sentry.Replay()
            ],
            trackComponents: true,
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

        return {
            provide: {
                Sentry
            }
        }
    }
})
