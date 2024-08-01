import CKEditor from '@ckeditor/ckeditor5-vue'

export default defineNuxtPlugin({
    parallel: true,
    setup(nuxtApp) {
        nuxtApp.vueApp.use(CKEditor)
    },
})
