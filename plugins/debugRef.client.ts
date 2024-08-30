import DebugRefPlugin from '@diffx/debug-ref'

export default defineNuxtPlugin({
    parallel: true,
    setup(nuxtApp) {
        DebugRefPlugin.install(nuxtApp.vueApp, {})
    },
})