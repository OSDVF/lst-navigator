// Import the core styles.
import '@ckeditor/ckeditor5-theme-lark/dist/index.css'
import '@ckeditor/ckeditor5-engine/dist/index.css'
import '@ckeditor/ckeditor5-ui/dist/index.css'

import '@ckeditor/ckeditor5-basic-styles/dist/index.css'
import '@ckeditor/ckeditor5-table/dist/index.css'


export default defineNuxtPlugin({
    parallel: true,
    async setup(nuxtApp) {
        const plugin = await import('@ckeditor/ckeditor5-vue')
        nuxtApp.vueApp.use(plugin.CkeditorPlugin)
    },
})
