import { plugin } from 'vue-input-autowidth'

export default defineNuxtPlugin({
    parallel: true,
    async setup(nuxtApp) {
        nuxtApp.vueApp.use(plugin)
    },
})
