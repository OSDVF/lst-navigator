import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin({
    parallel: true,
    async setup(nuxtApp) {
        const Sentry = await import('@sentry/node')
        Sentry.init({
            enabled: nuxtApp.$config.public.SENTRY_ENABLED,
            autoSessionTracking: import.meta.client,
            debug: nuxtApp.$config.public.ENV !== 'production',
            dsn: nuxtApp.$config.public.SENTRY_DSN,
            release: nuxtApp.$config.public.commitHash,
            environment: nuxtApp.$config.public.ENV,
        })
        Sentry.configureScope((scope) => {
            scope.setUser({
                id: 'server',
            })
        })

        nuxtApp.hook('vue:error', (err) => {
            Sentry.captureException(err)
            console.error('vue:error', JSON.stringify(err))
        })
        nuxtApp.vueApp.config.errorHandler = (error, context) => {
            Sentry.captureException(error)
            console.error('errorHandler', error, context)
        }

        nuxtApp.provide('Sentry', Sentry)
    },
})
