import type * as Sentry from '@sentry/vue'
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin({
    parallel: true,
    async setup(nuxtApp) {
        const sentryConfig: Partial<Sentry.BrowserOptions> = {
            enabled: nuxtApp.$config.public.SENTRY_ENABLED,
            autoSessionTracking: true,
            debug: nuxtApp.$config.public.ENV !== 'production',
            dsn: nuxtApp.$config.public.SENTRY_DSN,
            release: nuxtApp.$config.public.commitHash,
            environment: nuxtApp.$config.public.ENV,
        }

        const Sentry = await import('@sentry/vue')
        Sentry.init({
            ...sentryConfig,
            app: nuxtApp.vueApp,
            integrations: [new Sentry.Replay({
                _experiments: {
                    captureExceptions: true,
                },
            })],
            trackComponents: true,
            hooks: ['activate', 'create', 'destroy', 'mount', 'update'],
            // Capture Replay for 10% of all sessions,
            // plus for 100% of sessions with an error
            replaysSessionSampleRate: 0.1,
            replaysOnErrorSampleRate: 1,
        })
        nuxtApp.hook('vue:error', (err) => {
            Sentry.captureException(err)
            console.error('vue:error', err)
        })
        nuxtApp.vueApp.config.errorHandler = (error, context) => {
            Sentry.captureException(error)
            console.error('errorHandler', error, context)
        }

        nuxtApp.provide('Sentry', Sentry)
    },
})
