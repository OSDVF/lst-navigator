import { plugin } from 'vue-input-autowidth'

export default defineNuxtPlugin({
    parallel: true,
    enforce: 'pre',
    async setup(nuxtApp) {
        nuxtApp.vueApp.use(plugin)
    },
})
