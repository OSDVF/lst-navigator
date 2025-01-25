import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin({
    parallel: true,
    async setup(nuxtApp) {
        const Sentry = await import('@sentry/nuxt')
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
