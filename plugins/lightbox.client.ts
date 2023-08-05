import VueEasyLightbox from 'vue-easy-lightbox'
// import 'vue-easy-lightbox/dist/external-css/vue-easy-lightbox.css'

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.use(VueEasyLightbox)
})
