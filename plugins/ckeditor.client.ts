import type { App } from 'vue'

let appended = false
function append(app: App) {
    if (appended) {
        return
    }
    appended = true
    const ckeditor = document.createElement('script')
    ckeditor.src = 'https://unpkg.com/ckeditor5@44.1.0/dist/browser/ckeditor5.umd.js'
    app._container?.appendChild(ckeditor)
}

export default defineNuxtPlugin({
    parallel: true,
    setup(nuxtApp) {
        const settings = useSettings()
        watch(() => settings.richNoteEditor, (value) => {
            if (value) {
                append(nuxtApp.vueApp)
            }
        }, { immediate: true })
    },
})