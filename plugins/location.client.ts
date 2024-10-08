/**
 * @file A workaround for serving the whole app as SPA.
 * Nuxt navigates to the location specified in the loaded payload JSON by default.
 * When we create a fallback to '/' in the service worker, the whole app would always go to the root after load,
 * because it is specified in the loaded payload JSON.
 */

export default defineNuxtPlugin({
    parallel: false,
    enforce: 'pre',
    async setup(nuxtApp) {
        nuxtApp.provide('location', location.pathname)
    },
    hooks: {
        'app:mounted'(app) {
            if (location.pathname !== app.$nuxt.$location) {
                useRouter().replace(app.$nuxt.$location)
            }
        },
    },
})
