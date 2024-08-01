import { GesturePlugin } from '@vueuse/gesture'

export default defineNuxtPlugin({
    parallel: true,
    setup(nuxtApp) {
        nuxtApp.vueApp.use(GesturePlugin)
    },
})
