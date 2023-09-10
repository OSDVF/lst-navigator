import VueEasyLightbox from 'vue-easy-lightbox'

export default defineNuxtPlugin({
    parallel: true,
    setup(nuxtApp) {
        nuxtApp.vueApp.use(VueEasyLightbox)
    }
})
